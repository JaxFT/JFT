import Stripe from 'stripe'

// Lazy singleton, only constructed when first used so missing env vars
// surface as a clean 500 from the route, not a crash on import.
let _stripe: Stripe | null = null

export function stripeClient(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set as a Worker secret.')
  }
  _stripe = new Stripe(key, {
    // Pin the API version so future Stripe upgrades don't change behaviour silently.
    apiVersion: '2024-06-20',
    // Cloudflare Workers: force the SDK to use fetch instead of its default
    // Node http transport, which hangs forever under nodejs_compat. Without
    // this, every Stripe call times out at 80s with no response.
    httpClient: Stripe.createFetchHttpClient(),
  })
  return _stripe
}
