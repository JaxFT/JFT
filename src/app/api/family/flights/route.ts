import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardOrSuggestStamp } from '@/lib/passport-stamps-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.getUTCFullYear() >= 1900
}

// POST /api/family/flights
// Body: { from_airport, to_airport, flight_date, duration_mins?, notes? }
// Creates the flight, then fans a BRAVE_TRAVELLER stamp out to every
// active child in the family. Stamps are NOT deduped — each flight
// is its own milestone, so two flights = two stamps per child.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: {
    from_airport?: string; to_airport?: string; flight_date?: string;
    duration_mins?: number; notes?: string
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
  const notes = typeof body.notes === 'string' && body.notes.trim().length > 0
    ? body.notes.trim().slice(0, 500)
    : null

  // Insert the flight (RLS scopes to the signed-in parent).
  const { data: flight, error: flightErr } = await supabase
    .from('flights')
    .insert({
      parent_id: user.id,
      from_airport: from,
      to_airport: to,
      flight_date: date,
      duration_mins: duration,
      notes,
    })
    .select('id')
    .single()
  if (flightErr || !flight) {
    return NextResponse.json({ error: flightErr?.message ?? 'Could not save flight' }, { status: 500 })
  }

  // Fan out BRAVE_TRAVELLER to every child in the family. The stamp
  // engine uses service role, so we look up the parent's children
  // here with the cookie client (RLS handles scoping), then award
  // each via the engine with skipDedupe so each flight earns a new
  // stamp.
  const { data: kids } = await supabase
    .from('children')
    .select('id')
    .eq('parent_id', user.id)

  const flightLabel = `${from} → ${to}`
  // Park the stamp at noon UTC on the flight date so it sorts with
  // other same-day events naturally.
  const earnedAt = new Date(date + 'T12:00:00Z').toISOString()

  let stampsAwarded = 0
  for (const k of kids ?? []) {
    const r = await awardOrSuggestStamp({
      childId: k.id,
      type: 'BRAVE_TRAVELLER',
      countrySlug: null,
      note: flightLabel,
      awardedBy: 'system',
      earnedAt,
      skipDedupe: true,
    })
    if (r.ok && r.created) stampsAwarded++
  }

  return NextResponse.json({ ok: true, id: flight.id, stamps_awarded: stampsAwarded })
}

// (no GET — the page server-renders flights via passport-db helper)
