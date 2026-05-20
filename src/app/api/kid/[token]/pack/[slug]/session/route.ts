import { NextResponse } from 'next/server'
import { resolveKidPack, saveKidSession } from '@/lib/passport-kid-pack-db'
import {
  awardOrSuggestStamp, autoStampsForMissionComplete,
} from '@/lib/passport-stamps-db'
import { SECTION_KEYS } from '@/lib/adventurePackTypes'
import { getPackSectionKeys } from '@/lib/adventurePackMeta'
import type { AgeMode, SectionKey } from '@/lib/adventurePackTypes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PUT /api/kid/[token]/pack/[slug]/session
// Body: { age_mode: 'younger'|'older', missions_complete: string[] }
// Upserts the session row. May also insert a child_country_visits row
// (on first interaction) and set completed_at (on the run where every
// mission this pack actually has is first complete). On first
// completion, fires the ADVENTURE_PACK_COMPLETE stamp through the
// stamp engine.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string; slug: string }> },
) {
  const { token, slug } = await params
  const resolved = await resolveKidPack(token, slug)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }
  if (!resolved.isAssigned) {
    return NextResponse.json({ error: 'Not assigned.' }, { status: 403 })
  }

  let body: { age_mode?: string; missions_complete?: unknown } = {}
  try { body = await request.json() } catch {}

  const ageMode: AgeMode = body.age_mode === 'older' ? 'older' : 'younger'
  const missions = Array.isArray(body.missions_complete)
    ? (body.missions_complete as unknown[]).filter((m): m is string =>
        typeof m === 'string' && (SECTION_KEYS as readonly string[]).includes(m))
    : []

  // Per-pack section count — optional sections like 'wordsearch' only
  // count for countries whose data block includes them, so a pack
  // without wordsearch still completes at 10/10 (not 10/11).
  const packSectionCount = getPackSectionKeys(slug).length
  const result = await saveKidSession(
    resolved.child.id,
    slug,
    ageMode,
    missions,
    packSectionCount,
  )

  // Mission-completion auto-stamps. Fires BRAVE_EATER when the food
  // mission is now complete, LOCAL_LINGO for language, etc. Dedup
  // makes this safe to call on every session save.
  //
  // We collect just-minted stamps (created=true) and return them in
  // the response so the client can pop a celebration toast — the
  // moment of reward.
  const newStamps: Array<{ type: string; country_slug: string }> = []
  for (const m of missions) {
    const types = autoStampsForMissionComplete(m as SectionKey)
    for (const type of types) {
      const r = await awardOrSuggestStamp({
        childId: resolved.child.id,
        type,
        countrySlug: slug,
        awardedBy: 'system',
      })
      if (r.ok && r.created && r.status === 'awarded') {
        newStamps.push({ type, country_slug: slug })
      }
    }
  }

  // Full-pack completion stamp.
  if (result.firstCompletion) {
    const r = await awardOrSuggestStamp({
      childId: resolved.child.id,
      type: 'ADVENTURE_PACK_COMPLETE',
      countrySlug: slug,
      awardedBy: 'system',
    })
    if (r.ok && r.created && r.status === 'awarded') {
      newStamps.push({ type: 'ADVENTURE_PACK_COMPLETE', country_slug: slug })
    }
  }

  return NextResponse.json({ ok: true, ...result, newStamps })
}
