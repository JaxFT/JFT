import type { SupabaseClient } from '@supabase/supabase-js'

// Shared by every Stripe Checkout Session-creating route that can
// take a discount code (subscribe, checkout, checkout-pack,
// checkout-web-guide). Reserving records a redemption row but does
// NOT consume the usage cap, that's only ever incremented on actual
// payment (see complete_discount_reservation in
// supabase/discount-codes.sql), so an abandoned checkout never makes
// a code look "already used" to anyone else.

export type DiscountProductType = 'premium_annual' | 'guide' | 'pack'

export type DiscountReservation = {
  redemptionId: string
  percentOff: number
  stripeCouponId: string
}

// Attempts to reserve one redemption slot for `code` against the
// given product type. Returns null for any reason the code can't be
// used right now (doesn't exist, inactive, expired, exhausted, wrong
// product scope) — callers should surface a single generic "that code
// isn't valid" message rather than trying to distinguish why.
export async function reserveDiscountCode(
  supabase: SupabaseClient,
  code: string,
  productType: DiscountProductType,
  productRef: string | null,
  userId: string | null,
): Promise<DiscountReservation | null> {
  const { data, error } = await supabase.rpc('reserve_discount_code', {
    p_code: code,
    p_product_type: productType,
    p_product_ref: productRef,
    p_user_id: userId,
  })
  if (error) throw new Error(`Discount code check failed: ${error.message}`)
  const row = (Array.isArray(data) ? data[0] : null) as
    | { redemption_id: string; percent_off: number; stripe_coupon_id: string }
    | undefined
  if (!row) return null
  return {
    redemptionId: row.redemption_id,
    percentOff: row.percent_off,
    stripeCouponId: row.stripe_coupon_id,
  }
}

// Gives back a reservation that never turned into a paid checkout,
// e.g. Stripe session creation failed right after we reserved, or
// (via the webhook) the session expired unpaid.
export async function releaseDiscountReservation(
  supabase: SupabaseClient,
  redemptionId: string,
): Promise<void> {
  await supabase.rpc('release_discount_reservation', { p_redemption_id: redemptionId })
}

// Stamps the real Stripe Checkout Session id onto the reservation once
// we have one, so the webhook can look the redemption up by session id.
export async function attachSessionToReservation(
  supabase: SupabaseClient,
  redemptionId: string,
  sessionId: string,
): Promise<void> {
  await supabase
    .from('discount_code_redemptions')
    .update({ stripe_checkout_session_id: sessionId })
    .eq('id', redemptionId)
}
