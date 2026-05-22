import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { awardOrSuggestStamp } from '@/lib/passport-stamps-db'
import { getPackMeta } from '@/lib/adventurePackMeta'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.getUTCFullYear() >= 1900
}

function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// POST /api/family/flights
// Body: { from_airport, to_airport, flight_date, duration_mins?, distance_km?, notes?, destination_country_slug? }
// Creates the flight, then for each child in the family:
//   - Awards a Brave Traveller stamp (country-scoped if dest provided)
//   - Inserts a country visit row (so the map lights up from flights
//     alone, no Adventure Pack needed)
// Stamps are NOT deduped — each flight is its own milestone.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: {
    from_airport?: string; to_airport?: string; flight_date?: string;
    duration_mins?: number; distance_km?: number; notes?: string;
    destination_country_slug?: string | null
  } = {}
  try { body = await request.json() } catch {}

  const from = typeof body.from_airport === 'string' ? body.from_airport.trim().slice(0, 60) : ''
  const to   = typeof body.to_airport === 'string' ? body.to_airport.trim().slice(0, 60) : ''
  const date = typeof body.flight_date === 'string' ? body.flight_date : ''
  if (!from || !to) return NextResponse.json({ error: 'From and to are required.' }, { status: 400 })
  if (!isValidDate(date)) return NextResponse.json({ error: 'Date must be YYYY-MM-DD.' }, { status: 400 })

  const duration = typeof body.duration_mins === 'number' && body.duration_mins > 0 && body.duration_mins <= 24 * 60
    ? Math.round(body.duration_mins)
    : null
  const distance = typeof body.distance_km === 'number' && body.distance_km > 0 && body.distance_km <= 30000
    ? Math.round(body.distance_km)
    : null
  const notes = typeof body.notes === 'string' && body.notes.trim().length > 0
    ? body.notes.trim().slice(0, 500)
    : null

  // Validate optional destination country against known packs.
  let destCountrySlug: string | null = null
  if (body.destination_country_slug) {
    if (!getPackMeta(body.destination_country_slug)) {
      return NextResponse.json({ error: 'Unknown destination country.' }, { status: 400 })
    }
    destCountrySlug = body.destination_country_slug
  }

  const { data: flight, error: flightErr } = await supabase
    .from('flights')
    .insert({
      parent_id: user.id,
      from_airport: from,
      to_airport: to,
      flight_date: date,
      duration_mins: duration,
      distance_km: distance,
      notes,
    })
    .select('id')
    .single()
  if (flightErr || !flight) {
    return NextResponse.json({ error: flightErr?.message ?? 'Could not save flight' }, { status: 500 })
  }

  // Look up the parent's children via the cookie supabase client so RLS scopes correctly.
  const { data: kids } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', user.id)

  const flightLabel = `${from} → ${to}`
  const earnedAt = new Date(date + 'T12:00:00Z').toISOString()

  // For each kid: award stamp (country-scoped if dest provided) AND
  // try to add a country visit. Service role bypasses RLS for the
  // visit insert; 23505 (unique violation) means a visit already
  // existed, which we silently accept.
  const adminSb = destCountrySlug ? admin() : null

  let stampsAwarded = 0
  for (const k of kids ?? []) {
    const r = await awardOrSuggestStamp({
      childId: k.id,
      type: 'BRAVE_TRAVELLER',
      countrySlug: destCountrySlug,
      note: flightLabel,
      awardedBy: 'system',
      earnedAt,
      skipDedupe: true,
    })
    if (r.ok && r.created) stampsAwarded++

  }

  // One family-level visit per flight destination (shared across all
  // children). Service role bypasses RLS; 23505 (unique_violation)
  // means the family already had this country.
  if (destCountrySlug && adminSb) {
    const pack = getPackMeta(destCountrySlug)
    if (pack) {
      const { error: visitErr } = await adminSb
        .from('family_country_visits')
        .insert({
          parent_id: user.id,
          iso2: pack.iso2,
          first_visit_date: date,
        })
      if (visitErr && visitErr.code !== '23505') {
        console.error('[flights] family visit insert', visitErr)
      }
    }
  }

  return NextResponse.json({ ok: true, id: flight.id, stamps_awarded: stampsAwarded })
}
