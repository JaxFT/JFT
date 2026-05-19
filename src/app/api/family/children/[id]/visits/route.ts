import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPackMeta } from '@/lib/adventurePackData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Allow any reasonable past date back to 1900 and up to "today" in
// the user's local sense. We compare against today's UTC date which
// is close enough — a parent on either side of the dateline can
// freely pick a date that makes sense to them.
function isValidPastDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return false
  const minYear = 1900
  const todayUtc = new Date()
  if (d > todayUtc) return false
  if (d.getUTCFullYear() < minYear) return false
  return true
}

// POST /api/family/children/[id]/visits
// Body: { country_slug, first_visit_date }
// Creates (or upserts) a country visit for the child. Useful for
// backdating trips the family took before they started using JFT.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: { country_slug?: string; first_visit_date?: string } = {}
  try { body = await request.json() } catch {}

  const slug = typeof body.country_slug === 'string' ? body.country_slug : ''
  if (!getPackMeta(slug)) {
    return NextResponse.json({ error: 'Unknown country.' }, { status: 400 })
  }
  const date = typeof body.first_visit_date === 'string' ? body.first_visit_date : ''
  if (!isValidPastDate(date)) {
    return NextResponse.json({ error: 'Date must be a past date (YYYY-MM-DD).' }, { status: 400 })
  }

  // Upsert so calling POST on an existing slug acts as "set / replace
  // the date for this country" — convenient for the UI which doesn't
  // need to know whether a row exists yet.
  const { error } = await supabase
    .from('child_country_visits')
    .upsert(
      { child_id: id, country_slug: slug, first_visit_date: date },
      { onConflict: 'child_id,country_slug' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
