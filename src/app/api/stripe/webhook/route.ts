import { NextResponse } from 'next/server'
import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
import { stripeClient } from '@/lib/stripe'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Stripe → /api/stripe/webhook
// Two flows go through the same endpoint:
//  • One-off guide purchases   → checkout.session.completed (mode=payment) → purchases row
//  • Premium subscription      → checkout.session.completed (mode=subscription)
//                                + customer.subscription.{created,updated,deleted}
//                                → profiles.subscription_tier and friends
//
// NEVER skip signature verification — an unsigned POST could be from anywhere.
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, sig, secret)
  } catch (e) {
    return NextResponse.json(
      { error: `Signature verification failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 400 },
    )
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }
  // Service role bypasses RLS. Plain @supabase/supabase-js client.
  // @supabase/ssr's createServerClient folds in cookies and downgrades
  // auth to user-level, which would make these writes fail RLS.
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await handleSubscriptionCheckout(session, admin)
        } else {
          // mode === 'payment' (one-off guide purchase)
          const skip = await handleOneOffCheckout(session, admin)
          if (skip) return skip
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(sub, admin)
        break
      }
      default:
        // Unhandled event types are fine — Stripe sends a lot we don't care about.
        break
    }
  } catch (e) {
    // Non-2xx => Stripe retries with exponential backoff.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook handler error', type: event.type },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}

// ── helpers ──────────────────────────────────────────────────────

async function handleOneOffCheckout(
  session: Stripe.Checkout.Session,
  admin: SupabaseClient,
): Promise<NextResponse | null> {
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true, skipped: 'not paid' })
  }

  const userId = session.metadata?.user_id
  const productId = session.metadata?.product_id
  const amount = session.amount_total
  const paymentIntent = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id

  if (!userId || !productId || amount == null) {
    return NextResponse.json(
      { error: 'Missing metadata on checkout session', session: session.id },
      { status: 400 },
    )
  }

  // unique(user_id, product_id) prevents duplicate rows if Stripe retries.
  const { error } = await admin
    .from('purchases')
    .insert({
      user_id: userId,
      product_id: productId,
      stripe_payment_intent_id: paymentIntent ?? null,
      amount_pence: amount,
    })

  // 23505 = unique_violation: Stripe is retrying a previously-recorded purchase.
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return null
}

async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  admin: SupabaseClient,
) {
  const userId = session.metadata?.user_id
  if (!userId) {
    throw new Error(`Subscription checkout session ${session.id} missing user_id metadata`)
  }
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id ?? null
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id ?? null

  // Stamp the customer id immediately. The expiry + tier will be set by
  // the customer.subscription.created event that fires alongside this one,
  // which has the period end. We don't need to do anything else here.
  if (customerId) {
    const { error } = await admin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
    if (error) throw new Error(`Could not store stripe_customer_id: ${error.message}`)
  }
  // Defensive: if the subscription event has already arrived first (rare,
  // but Stripe doesn't guarantee order), make sure the subscription_id is
  // stored too. handleSubscriptionChange uses customer_id to find the user
  // in that case, so this is just belt-and-braces.
  if (subscriptionId) {
    await admin
      .from('profiles')
      .update({ stripe_subscription_id: subscriptionId })
      .eq('id', userId)
  }
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription,
  admin: SupabaseClient,
) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  // Find the user. Prefer subscription metadata (set on creation in /subscribe),
  // fall back to looking up by customer id, which is always set on the profile
  // by handleSubscriptionCheckout before the first subscription event.
  let userId = sub.metadata?.user_id || null
  if (!userId) {
    const { data: row } = await admin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    userId = row?.id ?? null
  }
  if (!userId) {
    throw new Error(`Could not resolve user for subscription ${sub.id} (customer ${customerId})`)
  }

  // Active means: actively paying OR in a paid period that hasn't lapsed.
  // 'trialing' counts too if we ever add trials.
  const activeStatuses: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due']
  const isActive = activeStatuses.includes(sub.status)

  // current_period_end is unix seconds.
  const expiresAt = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null

  // cancel_at_period_end is true while a cancel request is pending; clears
  // back to false if they undo it via the Customer Portal. Keep our flag in
  // sync so the account page "Cancellation requested on …" message is right.
  const cancellationRequestedAt = sub.cancel_at_period_end
    ? (sub.canceled_at
        ? new Date(sub.canceled_at * 1000).toISOString()
        : new Date().toISOString())
    : null

  const update: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    subscription_tier: isActive ? 'premium' : 'free',
    subscription_expires_at: expiresAt,
    cancellation_requested_at: cancellationRequestedAt,
  }

  const { error } = await admin
    .from('profiles')
    .update(update)
    .eq('id', userId)
  if (error) throw new Error(`Could not update profile for ${userId}: ${error.message}`)
}
