import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGuideBySlug } from '@/lib/guides-db'
import { stripeClient } from '@/lib/stripe'
import { reserveDiscountCode, releaseDiscountReservation, attachSessionToReservation } from '@/lib/discount-code-checkout'
import { getCampaignDiscountForGuide } from '@/lib/campaign-discount'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: { slug?: string; code?: string; ref?: string } = {}
  try { body = await request.json() } catch {}
  const slug = typeof body.slug === 'string' ? body.slug : null
  const requestedCode = typeof body.code === 'string' ? body.code.trim() : ''
  const campaignRef = typeof body.ref === 'string' ? body.ref.trim() : ''
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  // Guest checkout: no sign-in required. Stripe collects the email
  // anyway (for the receipt) and the webhook + success-page handler
  // turn that email into a Supabase user automatically, same pattern
  // already used by /api/stripe/checkout-web-guide. If the buyer IS
  // signed in we preload Stripe with their email and metadata so they
  // don't have to type it again and the purchase attaches to their
  // existing account directly.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const guide = await getGuideBySlug(slug)
  if (!guide || !guide.active) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  // Lookup stripe_price_id directly, guides-db doesn't return it
  const { data: priceRow } = await supabase
    .from('products')
    .select('stripe_price_id')
    .eq('id', guide.id)
    .single()
  const priceId = priceRow?.stripe_price_id as string | undefined
  if (!priceId) {
    return NextResponse.json(
      { error: 'This guide is not yet wired up for checkout, missing price.' },
      { status: 500 },
    )
  }

  // No explicit code typed? Fall back to whatever the visitor's
  // campaign link auto-applies for this guide (silently, nothing to
  // fail loudly on — an expired/missing campaign discount just means
  // no discount, same as never having had a ref at all).
  let effectiveCode = requestedCode
  if (!effectiveCode && campaignRef) {
    const campaignDiscount = await getCampaignDiscountForGuide(guide.slug, campaignRef)
    if (campaignDiscount) effectiveCode = campaignDiscount.code
  }

  let discountReservation: Awaited<ReturnType<typeof reserveDiscountCode>> = null
  if (effectiveCode) {
    discountReservation = await reserveDiscountCode(supabase, effectiveCode, 'guide', guide.id, user?.id ?? null)
    if (!discountReservation && requestedCode) {
      return NextResponse.json(
        { error: "That code isn't valid, has expired, or has already been fully redeemed." },
        { status: 400 },
      )
    }
  }

  const origin = new URL(request.url).origin
  const stripe = stripeClient()

  // Metadata flows through to the webhook, never trust client-supplied user IDs.
  // Duplicated onto payment_intent_data below so a refund or dispute can be traced back.
  const metadata: Record<string, string> = {
    kind: 'guide_one_off',
    product_id: guide.id,
    product_slug: guide.slug,
    ...(user ? { user_id: user.id } : {}),
    ...(discountReservation ? { discount_redemption_id: discountReservation.redemptionId } : {}),
    ...(campaignRef ? { campaign_ref: campaignRef } : {}),
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/guides/${slug}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/guides/${slug}?purchase=cancelled`,
      // Preload email when signed in; Stripe asks the buyer otherwise.
      ...(user?.email ? { customer_email: user.email } : {}),
      metadata,
      payment_intent_data: { metadata },
      ...(discountReservation ? { expires_at: Math.floor(Date.now() / 1000) + 30 * 60 } : {}),
      ...(discountReservation ? { discounts: [{ coupon: discountReservation.stripeCouponId }] } : {}),
    })

    if (!session.url) {
      if (discountReservation) await releaseDiscountReservation(supabase, discountReservation.redemptionId)
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }
    if (discountReservation) await attachSessionToReservation(supabase, discountReservation.redemptionId, session.id)
    return NextResponse.json({ url: session.url })
  } catch (e) {
    if (discountReservation) await releaseDiscountReservation(supabase, discountReservation.redemptionId)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 500 },
    )
  }
}
