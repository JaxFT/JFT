import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.getUTCFullYear() >= 1900
}

// PATCH /api/family/flights/[id]
// Edit a flight. Does NOT re-fire stamps — the BRAVE_TRAVELLER stamps
// already exist from the original POST.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: {
    from_airport?: string; to_airport?: string; flight_date?: string;
    duration_mins?: number | null; notes?: string | null
  } = {}
  try { body = await request.json() } catch {}

  const update: Record<string, unknown> = {}
  if (typeof body.from_airport === 'string') {
    const v = body.from_airport.trim().slice(0, 60)
    if (!v) return NextResponse.json({ error: 'From cannot be empty.' }, { status: 400 })
    update.from_airport = v
  }
  if (typeof body.to_airport === 'string') {
    const v = body.to_airport.trim().slice(0, 60)
    if (!v) return NextResponse.json({ error: 'To cannot be empty.' }, { status: 400 })
    update.to_airport = v
  }
  if (typeof body.flight_date === 'string') {
    if (!isValidDate(body.flight_date)) {
      return NextResponse.json({ error: 'Date must be YYYY-MM-DD.' }, { status: 400 })
    }
    update.flight_date = body.flight_date
  }
  if (body.duration_mins === null) {
    update.duration_mins = null
  } else if (typeof body.duration_mins === 'number' && body.duration_mins > 0 && body.duration_mins <= 24 * 60) {
    update.duration_mins = Math.round(body.duration_mins)
  }
  if (body.notes === null) {
    update.notes = null
  } else if (typeof body.notes === 'string') {
    update.notes = body.notes.trim().slice(0, 500) || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await supabase.from('flights').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/family/flights/[id]
// Removes the flight row. The BRAVE_TRAVELLER stamps already awarded
// stay put — a kid's earned milestones shouldn't disappear because the
// parent tidied the flight log.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { error } = await supabase.from('flights').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
