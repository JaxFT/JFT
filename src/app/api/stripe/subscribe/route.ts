import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe'
import { readWaystaqDiscount } from '@/lib/waystaq-discount'
import { reserveDiscountCode, releaseDiscountReservation, attachSessionToReservation } from '@/lib/discount-code-checkout'

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

    let body: { code?: string } = {}
    try { body = await request.json() } catch {}
    const requestedCode = typeof body.code === 'string' ? body.code.trim() : ''

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[subscribe] user', user ? user.id : 'none')
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to subscribe.', signInUrl: '/login?next=/account' },
        { status: 401 },
      )
    }

    let priceId = process.env.STRIPE_PRICE_PREMIUM_ANNUAL
    console.log('[subscribe] priceId', priceId ? 'set' : 'MISSING')
    if (!priceId) {
      return NextResponse.json(
        { error: 'Premium price is not configured (STRIPE_PRICE_PREMIUM_ANNUAL).' },
        { status: 500 },
      )
    }

    // A discount code the customer typed in takes priority over the
    // WayStaq cookie discount below, they explicitly asked for it.
    let discountReservation: Awaited<ReturnType<typeof reserveDiscountCode>> = null
    if (requestedCode) {
      discountReservation = await reserveDiscountCode(supabase, requestedCode, 'premium_annual', null, user.id)
      if (!discountReservation) {
        return NextResponse.json(
          { error: "That code isn't valid, has expired, or has already been fully redeemed." },
          { status: 400 },
        )
      }
      console.log('[subscribe] discount code reserved', discountReservation.redemptionId)
    }

    // WayStaq member discount: a valid £25 discount cookie swaps in the
    // discounted annual price, but ONLY when this account's email matches
    // the email the discount was verified for on WayStaq. That stops the
    // browser-scoped cookie from discounting an unrelated account.
    // Everything else (user_id metadata, the webhook that flips the profile
    // to premium) is unchanged, so access is granted exactly as it is for a
    // full-price subscription.
    if (!discountReservation) {
      const discount = await readWaystaqDiscount()
      if (discount && discount.email.toLowerCase() === (user.email ?? '').toLowerCase()) {
        const discountPrice = process.env.WAYSTAQ_DISCOUNT_PRICE_ID
        if (discountPrice) {
          priceId = discountPrice
          console.log('[subscribe] WayStaq £25 discount applied')
        } else {
          console.error('[subscribe] discount cookie present but WAYSTAQ_DISCOUNT_PRICE_ID not set')
        }
      }
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
    const metadata: Record<string, string> = {
      user_id: user.id,
      kind: 'premium_annual',
      ...(discountReservation ? { discount_redemption_id: discountReservation.redemptionId } : {}),
    }
    try {
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
        metadata,
        subscription_data: { metadata },
        // Doesn't affect the usage cap (that's only ever consumed on
        // actual payment, see reserve_discount_code), just keeps the
        // redemption's audit trail accurate — an abandoned session
        // gets marked 'released' quickly instead of sitting as
        // 'reserved' for 24h.
        ...(discountReservation ? { expires_at: Math.floor(Date.now() / 1000) + 30 * 60 } : {}),
        ...(discountReservation ? { discounts: [{ coupon: discountReservation.stripeCouponId }] } : {}),
      })
      console.log('[subscribe] session created', session.id, 'url:', !!session.url)

      if (!session.url) {
        if (discountReservation) await releaseDiscountReservation(supabase, discountReservation.redemptionId)
        return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
      }
      if (discountReservation) await attachSessionToReservation(supabase, discountReservation.redemptionId, session.id)
      return NextResponse.json({ url: session.url })
    } catch (e) {
      if (discountReservation) await releaseDiscountReservation(supabase, discountReservation.redemptionId)
      throw e
    }
  } catch (e) {
    console.error('[subscribe] error', e)
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { error: `Subscribe failed: ${msg}` },
      { status: 500 },
    )
  }
}
