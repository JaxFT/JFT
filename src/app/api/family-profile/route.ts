// GET / PUT /api/family-profile
// Read or upsert the signed-in user's saved family profile for the JFT
// Prompt Builder. RLS on family_profiles limits every operation to the
// user's own row, so we just use the cookie-based client.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Clamp adults to a sane 1-12; null when not provided.
function cleanAdults(v: unknown): number | null {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.max(1, Math.min(12, Math.round(n)))
}

// Kids' ages: array of 0-17, max 10 kids, ignore junk.
function cleanAges(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  return v
    .map(x => Number(x))
    .filter(n => Number.isFinite(n) && n >= 0 && n <= 17)
    .map(n => Math.round(n))
    .slice(0, 10)
}

function cleanStr(v: unknown, max = 80): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s.length ? s : null
}

// Travel style is multi-select: array of short strings, max 6, deduped.
function cleanStyles(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const seen = new Set<string>()
  for (const x of v) {
    if (typeof x !== 'string') continue
    const s = x.trim().slice(0, 40)
    if (s) seen.add(s)
  }
  return [...seen].slice(0, 6)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { data } = await supabase
    .from('family_profiles')
    .select('adults, kids_ages, home_country, home_airport, home_currency, travel_style')
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

  const row = {
    user_id: user.id,
    adults: cleanAdults(body.adults),
    kids_ages: cleanAges(body.kids_ages),
    home_country: cleanStr(body.home_country),
    home_airport: cleanStr(body.home_airport),
    home_currency: cleanStr(body.home_currency),
    travel_style: cleanStyles(body.travel_style),
  }

  const { error } = await supabase
    .from('family_profiles')
    .upsert(row, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
