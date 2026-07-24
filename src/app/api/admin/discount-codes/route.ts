import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { stripeClient } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function requireAdmin(): Promise<{ ok: boolean; email: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { ok: isAdminEmail(user?.email), email: user?.email ?? null }
}

// discount_codes has no RLS policies (locked to service-role only), so
// admin reads/writes go through the service-role client, same as
// call-requests' adminClient() pattern.
function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const { data, error } = await adminClient()
    .from('discount_codes')
    .select('id, code, percent_off, max_redemptions, times_redeemed, applies_to_premium, applies_to_guides, applies_to_packs, active, expires_at, created_by, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ codes: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok || !auth.email) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as
    | {
        code?: string
        percentOff?: number
        maxRedemptions?: number
        appliesToPremium?: boolean
        appliesToGuides?: boolean
        appliesToPacks?: boolean
        expiresAt?: string | null
      }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  const percentOff = Number(body.percentOff)
  const maxRedemptions = Number(body.maxRedemptions)
  const appliesToPremium = !!body.appliesToPremium
  const appliesToGuides = !!body.appliesToGuides
  const appliesToPacks = !!body.appliesToPacks
  const expiresAt = typeof body.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null

  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) {
    return NextResponse.json({ error: 'Percent off must be a whole number between 1 and 100' }, { status: 400 })
  }
  if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1) {
    return NextResponse.json({ error: 'Max redemptions must be a whole number of 1 or more' }, { status: 400 })
  }
  if (!appliesToPremium && !appliesToGuides && !appliesToPacks) {
    return NextResponse.json({ error: 'Pick at least one product the code applies to' }, { status: 400 })
  }

  // duration: 'once' means the discount applies to the first invoice
  // only, right for a one-off promo code, subscription renewals go
  // back to full price rather than discounting forever.
  let coupon: { id: string }
  try {
    coupon = await stripeClient().coupons.create({
      percent_off: percentOff,
      duration: 'once',
      name: code,
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Could not create Stripe coupon: ${e instanceof Error ? e.message : 'unknown error'}` },
      { status: 500 },
    )
  }

  const { data, error } = await adminClient()
    .from('discount_codes')
    .insert({
      code,
      percent_off: percentOff,
      max_redemptions: maxRedemptions,
      applies_to_premium: appliesToPremium,
      applies_to_guides: appliesToGuides,
      applies_to_packs: appliesToPacks,
      expires_at: expiresAt,
      stripe_coupon_id: coupon.id,
      created_by: auth.email,
    })
    .select('id, code, percent_off, max_redemptions, times_redeemed, applies_to_premium, applies_to_guides, applies_to_packs, active, expires_at, created_by, created_at')
    .single()

  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? `A code "${code}" already exists.`
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ code: data })
}
