import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Read-only preview so the UI can show "50% off applied" before the
// buyer commits to checkout. Never reserves a slot — that only
// happens at Stripe Checkout Session creation time (see
// src/lib/discount-code-checkout.ts). discount_codes has no public
// RLS policies, so this is the only path that can read it pre-auth
// (signup isn't logged in yet when they'd type a code in).
function adminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

const PRODUCT_TYPES = ['premium_annual', 'guide', 'pack'] as const
type ProductType = typeof PRODUCT_TYPES[number]

export async function POST(request: Request) {
  let body: { code?: string; productType?: string } = {}
  try { body = await request.json() } catch {}

  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const productType = body.productType as ProductType | undefined
  if (!code || !productType || !PRODUCT_TYPES.includes(productType)) {
    return NextResponse.json({ valid: false, reason: 'Missing code or product type.' }, { status: 400 })
  }

  const admin = adminClient()
  const { data, error } = await admin
    .from('discount_codes')
    .select('percent_off, max_redemptions, times_redeemed, active, expires_at, applies_to_premium, applies_to_guides, applies_to_packs')
    .ilike('code', code)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ valid: false, reason: 'Could not check that code right now.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ valid: false, reason: "That code doesn't exist." })
  }
  if (!data.active) {
    return NextResponse.json({ valid: false, reason: 'That code is no longer active.' })
  }
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return NextResponse.json({ valid: false, reason: 'That code has expired.' })
  }
  if (data.times_redeemed >= data.max_redemptions) {
    return NextResponse.json({ valid: false, reason: "That code has already been fully redeemed." })
  }
  const scopeOk =
    (productType === 'premium_annual' && data.applies_to_premium) ||
    (productType === 'guide' && data.applies_to_guides) ||
    (productType === 'pack' && data.applies_to_packs)
  if (!scopeOk) {
    return NextResponse.json({ valid: false, reason: "That code doesn't apply to this purchase." })
  }

  return NextResponse.json({ valid: true, percentOff: data.percent_off })
}
