// Resolves the discount (if any) a campaign link auto-applies for a
// specific guide, both for showing the reduced price on the guide
// page and for the checkout routes to reserve automatically without
// the visitor typing a code. One lookup, shared by both.

import { createClient as createSbClient } from '@supabase/supabase-js'

export type CampaignDiscount = { code: string; percentOff: number }

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// `ref` is whatever the visitor's campaign attribution currently is
// (query string on first landing, jft_ref cookie afterwards — see
// lib/campaign-ref-client.ts for the client-side mirror of this same
// fallback order). Only matches when the link still points at THIS
// guide and both the link and its discount code are active — a code
// that's been switched off or expired since the link was shared just
// silently stops discounting rather than erroring.
export async function getCampaignDiscountForGuide(guideSlug: string, ref: string | null): Promise<CampaignDiscount | null> {
  if (!ref) return null
  const admin = adminClient()
  const { data: link } = await admin
    .from('campaign_links')
    .select('discount_code_id')
    .eq('code', ref)
    .eq('guide_slug', guideSlug)
    .eq('active', true)
    .maybeSingle()
  if (!link?.discount_code_id) return null

  const { data: discount } = await admin
    .from('discount_codes')
    .select('code, percent_off, active, applies_to_guides, expires_at')
    .eq('id', link.discount_code_id)
    .maybeSingle()
  if (!discount || !discount.active || !discount.applies_to_guides) return null
  if (discount.expires_at && new Date(discount.expires_at) < new Date()) return null

  return { code: discount.code, percentOff: discount.percent_off }
}

export function applyPercentOff(pricePence: number, percentOff: number): number {
  return Math.round(pricePence * (100 - percentOff) / 100)
}
