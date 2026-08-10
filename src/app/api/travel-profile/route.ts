// GET / PUT /api/travel-profile
// Read or upsert the signed-in user's own Travel Profile core fields.
// RLS on travel_profiles limits every operation to the user's own row,
// so this just uses the cookie-based client, same pattern as
// /api/family-profile.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCountryByIso2 } from '@/lib/countries'
import { isValidBackgroundTheme } from '@/app/travel-profile/background-themes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function cleanStr(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s.length ? s : null
}

function cleanFocal(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 50
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { data } = await supabase
    .from('travel_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ profile: data ?? null })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}

  const iso2 = typeof body.fav_country_iso2 === 'string' ? body.fav_country_iso2.toLowerCase() : ''
  const favCountryIso2 = getCountryByIso2(iso2) ? iso2 : null

  const row = {
    user_id: user.id,
    is_public: body.is_public === true,
    bio: cleanStr(body.bio, 200),
    current_location: cleanStr(body.current_location, 80),
    background_theme: isValidBackgroundTheme(body.background_theme) ? body.background_theme : 'brand',
    hero_photo_focal_x: cleanFocal(body.hero_photo_focal_x),
    hero_photo_focal_y: cleanFocal(body.hero_photo_focal_y),
    fav_place: cleanStr(body.fav_place, 80),
    fav_food: cleanStr(body.fav_food, 80),
    fav_beach: cleanStr(body.fav_beach, 80),
    fav_swim: cleanStr(body.fav_swim, 80),
    fav_adventure: cleanStr(body.fav_adventure, 80),
    fav_sunset: cleanStr(body.fav_sunset, 80),
    fav_country_iso2: favCountryIso2,
    fav_country_why: favCountryIso2 ? cleanStr(body.fav_country_why, 300) : null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('travel_profiles')
    .upsert(row, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
