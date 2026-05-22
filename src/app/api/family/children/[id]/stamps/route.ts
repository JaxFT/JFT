import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardOrSuggestStamp } from '@/lib/passport-stamps-db'
import { getPackMeta } from '@/lib/adventurePackMeta'
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
  'MAP_READER',
  'MONEY_CHANGER',
  'GEOGRAPHY_GENIUS',
  'SCAVENGER_HUNTER',
  'SENSE_SEEKER',
  'STORY_KEEPER',
  'FAMILY_CHATTERBOX',
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

  let body: {
    type?: string
    country_slug?: string | null
    note?: string | null
    earned_at?: string
    custom_label?: string
    custom_emoji?: string
    custom_shape?: string
    custom_ink?: string
  } = {}
  try { body = await request.json() } catch {}

  const type = body.type as StampType | undefined
  if (!type || (!ALL_TYPES.includes(type) && type !== 'CUSTOM')) {
    return NextResponse.json({ error: 'Unknown stamp type.' }, { status: 400 })
  }

  // CUSTOM stamps don't carry a country (issuer is JFT). For the 17
  // system types, country_slug is optional and must be a real pack.
  let countrySlug: string | null = null
  if (type !== 'CUSTOM' && body.country_slug) {
    if (!getPackMeta(body.country_slug)) {
      return NextResponse.json({ error: 'Unknown country.' }, { status: 400 })
    }
    countrySlug = body.country_slug
  }

  // Validate the custom fields when type='CUSTOM'. Shape/ink lists
  // mirror the DB CHECK constraint so an invalid value 400s here
  // rather than dying at insert time.
  let customLabel: string | undefined
  let customEmoji: string | undefined
  let customShape: string | undefined
  let customInk: string | undefined
  if (type === 'CUSTOM') {
    const label = (body.custom_label ?? '').trim()
    if (!label || label.length > 60) {
      return NextResponse.json({ error: 'Custom label must be 1–60 characters.' }, { status: 400 })
    }
    const emoji = (body.custom_emoji ?? '').trim()
    if (!emoji) {
      return NextResponse.json({ error: 'Custom emoji is required.' }, { status: 400 })
    }
    const shape = body.custom_shape
    const ALLOWED_SHAPES = ['circle','oval','rounded','flag','shield','hexagon']
    if (!shape || !ALLOWED_SHAPES.includes(shape)) {
      return NextResponse.json({ error: 'Custom shape is required.' }, { status: 400 })
    }
    const ink = body.custom_ink
    if (!ink || !/^#[0-9a-fA-F]{6}$/.test(ink)) {
      return NextResponse.json({ error: 'Custom ink must be a #RRGGBB colour.' }, { status: 400 })
    }
    customLabel = label
    customEmoji = emoji
    customShape = shape
    customInk = ink
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
    customLabel,
    customEmoji,
    customShape,
    customInk,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: result.id })
}
