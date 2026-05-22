import { NextResponse } from 'next/server'
import { getChildByToken } from '@/lib/passport-kid-db'
import { awardOrSuggestStamp } from '@/lib/passport-stamps-db'
import { getPackMeta } from '@/lib/adventurePackMeta'
import type { StampType } from '@/lib/passport-types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Same 17 system types the parent flow accepts. CUSTOM is also
// allowed via the same endpoint when the body carries the four
// custom_* fields.
const ALL_SYSTEM_TYPES: StampType[] = [
  'BRAVE_EATER', 'LOCAL_LINGO', 'STEP_CHAMP', 'ADVENTURE_PACK_COMPLETE',
  'EXPLORER_DAY', 'CULTURE_SPOTTER', 'NATURE_LOVER', 'BRAVE_TRAVELLER',
  'WATER_ADVENTURER', 'EARLY_BIRD', 'MAP_READER', 'MONEY_CHANGER',
  'GEOGRAPHY_GENIUS', 'SCAVENGER_HUNTER', 'ANIMAL_SPOTTER',
  'SENSE_SEEKER', 'STORY_KEEPER', 'FAMILY_CHATTERBOX',
]

// POST /api/kid/[token]/stamps/suggest
// Body: same shape as the parent stamp endpoint (type, country_slug,
// note, custom_*, earned_at). Always lands as awarded_by='self',
// status='suggested' regardless of stamp_auto_approve — kids can't
// auto-approve their own ideas; the parent decides from the
// approval queue on /family.
//
// Only kids in 'guided' or 'creator' permission_mode are allowed
// to suggest. 'view' kids get a 403.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const child = await getChildByToken(token)
  if (!child) return NextResponse.json({ error: 'Unknown kid.' }, { status: 404 })

  if (child.permission_mode === 'view') {
    return NextResponse.json({ error: 'Suggesting is off in view mode.' }, { status: 403 })
  }

  let body: {
    type?: string
    country_slug?: string | null
    note?: string | null
    custom_label?: string
    custom_emoji?: string
    custom_shape?: string
    custom_ink?: string
    earned_at?: string
  } = {}
  try { body = await request.json() } catch {}

  const type = body.type as StampType | undefined
  if (!type || (!ALL_SYSTEM_TYPES.includes(type) && type !== 'CUSTOM')) {
    return NextResponse.json({ error: 'Unknown stamp type.' }, { status: 400 })
  }

  let countrySlug: string | null = null
  if (body.country_slug) {
    if (!getPackMeta(body.country_slug)) {
      return NextResponse.json({ error: 'Unknown country.' }, { status: 400 })
    }
    countrySlug = body.country_slug
  }

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

  // Kids don't get to backdate their own suggestions, the moment
  // is now. Parent can edit on approval if needed (future).
  const result = await awardOrSuggestStamp({
    childId: child.id,
    type,
    countrySlug,
    note,
    awardedBy: 'self',
    customLabel,
    customEmoji,
    customShape,
    customInk,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: result.id, status: result.status })
}
