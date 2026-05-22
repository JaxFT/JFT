import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCountryByIso2 } from '@/lib/countries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Allow any reasonable past date back to 1900 and up to "today" in
// the user's local sense.
function isValidPastDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return false
  const todayUtc = new Date()
  if (d > todayUtc) return false
  if (d.getUTCFullYear() < 1900) return false
  return true
}

// POST /api/family/children/[id]/visits
// Body: { iso2, first_visit_date }
// (The [id] in the URL is kept for backwards compat with the
// per-child UI, but country visits are now stored at the family
// level: one row per parent_id + iso2.)
//
// Accepts any ISO 3166-1 alpha-2 country code, not just the 35
// Adventure Pack countries. Useful for parents who travel to
// places we don't have packs for.
export async function POST(
  request: Request,
  _ctx: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: { iso2?: string; country_slug?: string; first_visit_date?: string } = {}
  try { body = await request.json() } catch {}

  // Accept either `iso2` (preferred) or legacy `country_slug` shape;
  // for now both produce a 400 if we can't resolve the country.
  const iso2Raw = (body.iso2 ?? '').toString().trim().toLowerCase()
  if (!iso2Raw || !/^[a-z]{2}$/.test(iso2Raw) || !getCountryByIso2(iso2Raw)) {
    return NextResponse.json({ error: 'Unknown country.' }, { status: 400 })
  }
  const date = typeof body.first_visit_date === 'string' ? body.first_visit_date : ''
  if (!isValidPastDate(date)) {
    return NextResponse.json({ error: 'Date must be a past date (YYYY-MM-DD).' }, { status: 400 })
  }

  // Upsert so calling POST on an existing country acts as "set /
  // replace the date" — the UI doesn't need to know whether a row
  // exists yet. Parent_id pulled from the auth session, never the URL.
  const { error } = await supabase
    .from('family_country_visits')
    .upsert(
      { parent_id: user.id, iso2: iso2Raw, first_visit_date: date },
      { onConflict: 'parent_id,iso2' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
