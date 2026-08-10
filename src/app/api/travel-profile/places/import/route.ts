// POST — one-time copy of the family's Adventure Passport country
// visits (family_country_visits) into this user's own "been" list on
// their Travel Profile. A copy, not a live sync: once imported, the
// two lists are independent, editing one doesn't touch the other.
// Safe to call more than once, existing rows are just skipped.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { data: visits, error: visitsErr } = await supabase
    .from('family_country_visits')
    .select('iso2')
    .eq('parent_id', user.id)
  if (visitsErr) return NextResponse.json({ error: visitsErr.message }, { status: 500 })
  if (!visits || visits.length === 0) {
    return NextResponse.json({ ok: true, imported: 0 })
  }

  const { data: already } = await supabase
    .from('travel_profile_places')
    .select('iso2')
    .eq('user_id', user.id)
    .eq('list_type', 'been')
  const existing = new Set((already ?? []).map(r => r.iso2))

  const toInsert = visits
    .map(v => v.iso2.toLowerCase())
    .filter(iso2 => !existing.has(iso2))
    .map(iso2 => ({ user_id: user.id, iso2, list_type: 'been' as const }))

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, imported: 0 })
  }

  const { error: insertErr } = await supabase
    .from('travel_profile_places')
    .insert(toInsert)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, imported: toInsert.length })
}
