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
  // Wrap the whole thing so any unexpected throw turns into a clean 500
  // with a visible error message instead of a worker-level crash that
  // shows up as "Status: —" in the browser with no diagnostic.
  try {
    console.log('[subscribe] start')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[subscribe] user', user ? user.id : 'none')
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to subscribe.', signInUrl: '/login?next=/account' },
        { status: 401 },
      )
    }

    const priceId = process.env.STRIPE_PRICE_PREMIUM_ANNUAL
    console.log('[subscribe] priceId', priceId ? 'set' : 'MISSING')
    if (!priceId) {
      return NextResponse.json(
        { error: 'Premium price is not configured (STRIPE_PRICE_PREMIUM_ANNUAL).' },
        { status: 500 },
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', user.id)
      .maybeSingle()
    console.log('[subscribe] profile', { tier: profile?.subscription_tier, hasCustomer: !!profile?.stripe_customer_id, profileError: profileError?.message })

    if (profile?.subscription_tier === 'premium') {
      return NextResponse.json(
        { error: 'You already have Premium.' },
        { status: 400 },
      )
    }

    const origin = new URL(request.url).origin
    console.log('[subscribe] origin', origin)

    console.log('[subscribe] creating stripe client')
    const stripe = stripeClient()
    console.log('[subscribe] calling stripe.checkout.sessions.create')
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      success_url: `${origin}/account?subscribe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/account?subscribe=cancelled`,
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
    console.log('[subscribe] session created', session.id, 'url:', !!session.url)

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[subscribe] error', e)
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { error: `Subscribe failed: ${msg}` },
      { status: 500 },
    )
  }
}
