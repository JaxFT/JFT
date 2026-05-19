import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/stripe/subscribe
// Starts a Checkout session for the £49.99/year Premium subscription.
// The webhook (checkout.session.completed + customer.subscription.*) is
// the source of truth for flipping profiles.subscription_tier to 'premium'.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Please sign in to subscribe.', signInUrl: '/login?next=/account' },
      { status: 401 },
    )
  }

  const priceId = process.env.STRIPE_PRICE_PREMIUM_ANNUAL
  if (!priceId) {
    return NextResponse.json(
      { error: 'Premium price is not configured (STRIPE_PRICE_PREMIUM_ANNUAL).' },
      { status: 500 },
    )
  }

  // If the user already has a Stripe customer id, reuse it so portals and
  // subscriptions stay linked to the same customer across upgrades.
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_tier')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.subscription_tier === 'premium') {
    return NextResponse.json(
      { error: 'You already have Premium.' },
      { status: 400 },
    )
  }

  const origin = new URL(request.url).origin
  const stripe = stripeClient()

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse existing customer if we have one, otherwise let Stripe create
      // one from the email. Never pass both customer and customer_email.
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      success_url: `${origin}/account?subscribe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/account?subscribe=cancelled`,
      // Metadata flows through to the webhook. Never trust client-supplied user IDs.
      metadata: {
        user_id: user.id,
        kind: 'premium_annual',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          kind: 'premium_annual',
        },
      },
      allow_promotion_codes: true,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }
    return NextResponse.json({ url: session.url })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 500 },
    )
  }
}
