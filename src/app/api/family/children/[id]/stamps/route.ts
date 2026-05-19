import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardOrSuggestStamp } from '@/lib/passport-stamps-db'
import { getPackMeta } from '@/lib/adventurePackData'
import type { StampType } from '@/lib/passport-types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALL_TYPES: StampType[] = [
  'BRAVE_EATER',
  'LOCAL_LINGO',
  'STEP_CHAMP',
  'ADVENTURE_PACK_COMPLETE',
  'EXPLORER_DAY',
  'CULTURE_SPOTTER',
  'NATURE_LOVER',
  'BRAVE_TRAVELLER',
  'WATER_ADVENTURER',
  'EARLY_BIRD',
]

// POST /api/family/children/[id]/stamps
// Manually award a stamp from the parent dashboard. Always lands as
// 'awarded' (parent decision is final). Supports backdated earned_at.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  // Verify the parent owns this child. RLS would refuse later anyway,
  // but a check here means we return a clean 403 instead of a confusing
  // "Could not award" from the engine.
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  let body: { type?: string; country_slug?: string | null; note?: string | null; earned_at?: string } = {}
  try { body = await request.json() } catch {}

  const type = body.type as StampType | undefined
  if (!type || !ALL_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Unknown stamp type.' }, { status: 400 })
  }

  let countrySlug: string | null = null
  if (body.country_slug) {
    if (!getPackMeta(body.country_slug)) {
      return NextResponse.json({ error: 'Unknown country.' }, { status: 400 })
    }
    countrySlug = body.country_slug
  }

  const note = typeof body.note === 'string' && body.note.trim().length > 0
    ? body.note.trim().slice(0, 500)
    : null

  let earnedAt: string | undefined
  if (typeof body.earned_at === 'string' && body.earned_at) {
    // Accept YYYY-MM-DD (date-only) and convert to noon UTC so it
    // sorts naturally with timestamped system stamps from the same
    // day. Reject anything else to keep data clean.
    if (/^\d{4}-\d{2}-\d{2}$/.test(body.earned_at)) {
      const d = new Date(body.earned_at + 'T12:00:00Z')
      if (!Number.isNaN(d.getTime())) earnedAt = d.toISOString()
    } else {
      const d = new Date(body.earned_at)
      if (!Number.isNaN(d.getTime())) earnedAt = d.toISOString()
    }
  }

  const result = await awardOrSuggestStamp({
    childId: id,
    type,
    countrySlug,
    note,
    awardedBy: 'parent',
    earnedAt,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: result.id })
}
