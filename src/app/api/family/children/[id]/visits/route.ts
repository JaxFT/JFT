import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCountryByIso2 } from '@/lib/countries'
import { getPackByIso2 } from '@/lib/adventurePackMeta'
import { autoAssignPackForVisit, awardOrSuggestStamp } from '@/lib/passport-stamps-db'

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

  // Was this country already in the family's list? We need to know
  // so we only auto-assign packs on a genuine first visit (not on a
  // date-only edit via the same endpoint).
  const { data: existing } = await supabase
    .from('family_country_visits')
    .select('iso2')
    .eq('parent_id', user.id)
    .eq('iso2', iso2Raw)
    .maybeSingle()
  const isNewVisit = !existing

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

  // First visit → auto-assign the pack (if one exists for this
  // country and is live) to every child in the family who doesn't
  // already have it. No-op for non-pack countries.
  if (isNewVisit) {
    await autoAssignPackForVisit(user.id, iso2Raw)

    // Award a BRAVE_TRAVELLER stamp to every child in the family,
    // dated to the visit date the parent entered. Mirrors what the
    // flight-log path used to do: adding a country = the kids "went"
    // there, which is a brave-traveller moment. Only fires when the
    // country has a pack (BRAVE_TRAVELLER stamps in the system are
    // scoped by pack slug; non-pack countries don't have a passport
    // page for the stamp to sit against anyway).
    const pack = getPackByIso2(iso2Raw)
    if (pack && pack.status === 'live') {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        const admin = createSbClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceKey,
          { auth: { persistSession: false, autoRefreshToken: false } },
        )
        const { data: kidsData } = await admin
          .from('children')
          .select('id')
          .eq('parent_id', user.id)
        const kidIds = ((kidsData ?? []) as Array<{ id: string }>).map(k => k.id)
        // Date-only → noon UTC so it lands on the right calendar day
        // regardless of the viewer's timezone.
        const earnedAt = `${date}T12:00:00.000Z`
        await Promise.all(
          kidIds.map(childId =>
            awardOrSuggestStamp({
              childId,
              type: 'BRAVE_TRAVELLER',
              countrySlug: pack.slug,
              awardedBy: 'system',
              earnedAt,
            }),
          ),
        )
      }
    }
  }

  return NextResponse.json({ ok: true })
}
