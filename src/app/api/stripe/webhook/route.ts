import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripeClient } from '@/lib/stripe'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Stripe → /api/stripe/webhook
// Verifies the signature header, then records purchases on
// checkout.session.completed. NEVER skip signature verification, even
// for "obvious" events — an unsigned POST could be from anywhere.
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // payment_status must be 'paid' before we record anything
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true, skipped: 'not paid' })
    }

    const userId = session.metadata?.user_id
    const productId = session.metadata?.product_id
    const amount = session.amount_total // pence
    const paymentIntent = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id

    if (!userId || !productId || amount == null) {
      // Log the request_id for tracing — Stripe will retry on non-2xx
      return NextResponse.json(
        { error: 'Missing metadata on checkout session', session: session.id },
        { status: 400 },
      )
    }

    // Service role bypasses RLS — this runs without a user session
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      },
    )

    // unique(user_id, product_id) prevents duplicate rows if Stripe retries
    const { error } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        product_id: productId,
        stripe_payment_intent_id: paymentIntent ?? null,
        amount_pence: amount,
      })

    // 23505 = unique_violation — Stripe is retrying a previously-recorded purchase
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
