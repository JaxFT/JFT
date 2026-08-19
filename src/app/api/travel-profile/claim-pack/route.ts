// POST /api/travel-profile/claim-pack — grants one free Adventure Pack
// of the caller's choice, once, after their Travel Profile meets the
// completion bar (photo + 3 "been" + 2 "want to go" + public).
// Everything is re-validated server-side, the client-side checklist is
// just UI, never trusted for the actual grant.

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getPackMeta } from '@/lib/adventurePackMeta'
import { isPremiumTier } from '@/lib/profile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}
  const slug = typeof body.country_slug === 'string' ? body.country_slug : ''
  const pack = getPackMeta(slug)
  if (!pack || pack.isFree || pack.status !== 'live') {
    return NextResponse.json({ error: 'Pick a valid country pack' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle()
  if (isPremiumTier(profile?.subscription_tier)) {
    return NextResponse.json({ error: 'Premium already includes every Adventure Pack' }, { status: 400 })
  }

  const { data: existingClaim } = await supabase
    .from('profile_completion_pack_claims')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existingClaim) {
    return NextResponse.json({ error: "You've already claimed your free pack" }, { status: 400 })
  }

  const [{ data: travelProfile }, { count: beenCount }, { count: wantCount }] = await Promise.all([
    supabase.from('travel_profiles').select('hero_photo_url, is_public').eq('user_id', user.id).maybeSingle(),
    supabase.from('travel_profile_places').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('list_type', 'been'),
    supabase.from('travel_profile_places').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('list_type', 'want'),
  ])
  const meetsCriteria = !!travelProfile?.hero_photo_url
    && travelProfile?.is_public === true
    && (beenCount ?? 0) >= 3
    && (wantCount ?? 0) >= 2
  if (!meetsCriteria) {
    return NextResponse.json({ error: 'Finish your profile first, photo, 3 countries been, 2 want to go, and public' }, { status: 400 })
  }

  const admin = adminClient()
  const { error: purchaseError } = await admin
    .from('jax_pack_purchases')
    .upsert({ user_id: user.id, country_slug: slug }, { onConflict: 'user_id,country_slug' })
  if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 })

  const { error: claimError } = await admin
    .from('profile_completion_pack_claims')
    .insert({ user_id: user.id, country_slug: slug })
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 })

  return NextResponse.json({ ok: true, country_slug: slug })
}
