import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isValidPastDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return false
  if (d > new Date()) return false
  if (d.getUTCFullYear() < 1900) return false
  return true
}

// PATCH /api/family/children/[id]/visits/[slug]
// Body: { first_visit_date }
// Edit just the date on an existing visit.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; slug: string }> },
) {
  const { id, slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: { first_visit_date?: string } = {}
  try { body = await request.json() } catch {}
  const date = typeof body.first_visit_date === 'string' ? body.first_visit_date : ''
  if (!isValidPastDate(date)) {
    return NextResponse.json({ error: 'Date must be a past date (YYYY-MM-DD).' }, { status: 400 })
  }

  const { error } = await supabase
    .from('child_country_visits')
    .update({ first_visit_date: date })
    .eq('child_id', id)
    .eq('country_slug', slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/family/children/[id]/visits/[slug]
// Removes a country visit. Pack progress for the same country stays
// put — the parent can re-add the visit later without losing data.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; slug: string }> },
) {
  const { id, slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { error } = await supabase
    .from('child_country_visits')
    .delete()
    .eq('child_id', id)
    .eq('country_slug', slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
