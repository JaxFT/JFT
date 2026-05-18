// Shared helpers for profile-derived state. Single source of truth so
// the "are you premium?" check is consistent across every page and
// API endpoint.
//
// Background: profiles.subscription_tier is a free-form text column.
// In production it gets values like 'free' / 'premium' but a row
// edited by hand (or future Stripe webhooks before they're wired up
// strictly) might end up as 'Premium', 'PREMIUM', or have trailing
// whitespace. The strict `=== 'premium'` check that used to live in
// every page would then silently treat the user as free and show
// upgrade CTAs to a paying member. This helper normalises before
// comparing.

export function isPremiumTier(tier: string | null | undefined): boolean {
  if (!tier) return false
  return tier.trim().toLowerCase() === 'premium'
}
