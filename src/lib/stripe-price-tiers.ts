// Single source of truth for the standard guide price tiers we sell
// through Stripe. The admin guide editor reads `price_pence` from
// the form; when it matches a tier here, the API auto-fills the
// matching `stripe_price_id` on the guide row, so checkout works
// without a separate manual SQL update per guide.
//
// To add a new tier:
//   1. Create the price in the Stripe dashboard
//   2. Add a `{ pricePence, stripePriceId, label }` line below
//   3. Deploy
//
// Tiers that don't appear here can still be priced manually by
// editing `stripe_price_id` in the DB; the admin route only fires
// the auto-wire when there's a match here, never the other way.

export type GuidePriceTier = {
  pricePence: number
  stripePriceId: string
  label: string
}

export const GUIDE_PRICE_TIERS: readonly GuidePriceTier[] = [
  { pricePence: 199, stripePriceId: 'price_1TZOtLBedsajl023PadqOgli', label: '£1.99' },
  { pricePence: 299, stripePriceId: 'price_1TZE4JBedsajl0230A10MWbc', label: '£2.99' },
  { pricePence: 499, stripePriceId: 'price_1TZE4BBedsajl0232mXDp5bq', label: '£4.99' },
  { pricePence: 699, stripePriceId: 'price_1TZE40Bedsajl023eFWpNnIM', label: '£6.99' },
  { pricePence: 899, stripePriceId: 'price_1TZE0OBedsajl023tJbVUHOL', label: '£8.99' },
]

export function stripePriceIdForPence(pence: number): string | null {
  const tier = GUIDE_PRICE_TIERS.find(t => t.pricePence === pence)
  return tier ? tier.stripePriceId : null
}
