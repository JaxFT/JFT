import { NextResponse } from 'next/server'
import { resolveKidPack, saveKidSession } from '@/lib/passport-kid-pack-db'
import {
  awardOrSuggestStamp, autoStampsForMissionComplete,
} from '@/lib/passport-stamps-db'
import { SECTION_KEYS } from '@/lib/adventurePackTypes'
import type { AgeMode, SectionKey } from '@/lib/adventurePackTypes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PUT /api/kid/[token]/pack/[slug]/session
// Body: { age_mode: 'younger'|'older', missions_complete: string[] }
// Upserts the session row. May also insert a child_country_visits row
// (on first interaction) and set completed_at (on the run where all
// 9 missions are first complete). On first completion, fires the
// ADVENTURE_PACK_COMPLETE stamp through the stamp engine.
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

  const result = await saveKidSession(
    resolved.child.id,
    slug,
    ageMode,
    missions,
    SECTION_KEYS.length,
  )

  // Mission-completion auto-stamps. Fires BRAVE_EATER when the food
  // mission is now complete, LOCAL_LINGO for language. Dedup makes
  // this safe to call on every session save.
  for (const m of missions) {
    const types = autoStampsForMissionComplete(m as SectionKey)
    for (const type of types) {
      await awardOrSuggestStamp({
        childId: resolved.child.id,
        type,
        countrySlug: slug,
        awardedBy: 'system',
      })
    }
  }

  // Full-pack completion stamp.
  if (result.firstCompletion) {
    await awardOrSuggestStamp({
      childId: resolved.child.id,
      type: 'ADVENTURE_PACK_COMPLETE',
      countrySlug: slug,
      awardedBy: 'system',
    })
  }

  return NextResponse.json({ ok: true, ...result })
}
