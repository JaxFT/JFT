import type Stripe from 'stripe'

// JFT and WayStaq share one Stripe account, so this webhook also receives
// every WayStaq payment. WayStaq tags its checkouts and subscriptions with
// metadata.app = 'waystaq' (since 2026-10-31); older WayStaq ones carry no
// tag, so subscriptions are also checked against JFT's own Premium prices.
// Before this, a WayStaq annual signup was emailed out as a JFT Premium
// signup and its subscription events failed here on every retry.

// JFT Premium prices. Env vars first (current prices), then the IDs known
// on 2026-10-31 so older subscriptions still match after a price change.
function jftPremiumPriceIds(): string[] {
  return [
    process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    process.env.WAYSTAQ_DISCOUNT_PRICE_ID,
    'price_1TYcwmBedsajl023wYj7iJIJ', // £49.99/yr
    'price_1TzATOBedsajl0238of26GkP', // £5/mo
    'price_1TbFy7Bedsajl0230KDigaww', // £25/yr, WayStaq-member discount
  ].filter((id): id is string => !!id)
}

export function isWaystaqObject(obj: { metadata?: Stripe.Metadata | null }): boolean {
  return obj.metadata?.app === 'waystaq'
}

// A subscription checkout is JFT Premium only when /api/stripe/subscribe
// made it (it always sets kind = premium_annual / premium_monthly).
export function isJftPremiumCheckout(session: Stripe.Checkout.Session): boolean {
  if (isWaystaqObject(session)) return false
  return (session.metadata?.kind ?? '').startsWith('premium_')
}

export function isJftPremiumSubscription(sub: Stripe.Subscription): boolean {
  if (isWaystaqObject(sub)) return false
  if ((sub.metadata?.kind ?? '').startsWith('premium_')) return true
  const ids = jftPremiumPriceIds()
  return (sub.items?.data ?? []).some(item => !!item.price && ids.includes(item.price.id))
}
