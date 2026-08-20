// GET / POST /api/game/progress
// Sync the signed-in user's Adventure Game progress (best scores,
// unlocks, passport stamps) across devices. The game itself works
// entirely offline via localStorage, so both handlers 401 quietly for
// anonymous players — the client just ignores that and keeps using
// localStorage, same pattern as /api/travel-profile.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { COUNTRIES } from '@/lib/game/countries'
import type { GameProgress } from '@/lib/game/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_SLUGS = new Set(COUNTRIES.map(c => c.slug))

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ progress: null }, { status: 401 })

  const { data } = await supabase
    .from('game_progress')
    .select('country_slug, best_score, unlocked, passport_stamp')
    .eq('user_id', user.id)

  const progress: GameProgress = {}
  for (const row of data ?? []) {
    if (!VALID_SLUGS.has(row.country_slug)) continue
    progress[row.country_slug] = {
      bestScore: row.best_score,
      unlocked: row.unlocked,
      passportStamp: row.passport_stamp,
    }
  }
  return NextResponse.json({ progress })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await request.json().catch(() => null) as { progress?: GameProgress } | null
  const progress = body?.progress
  if (!progress || typeof progress !== 'object') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const rows = Object.entries(progress)
    .filter(([slug]) => VALID_SLUGS.has(slug))
    .map(([slug, entry]) => ({
      user_id: user.id,
      country_slug: slug,
      best_score: Math.max(0, Math.round(Number(entry.bestScore) || 0)),
      unlocked: Boolean(entry.unlocked),
      passport_stamp: Boolean(entry.passportStamp),
    }))

  if (rows.length === 0) return NextResponse.json({ ok: true })

  const { error } = await supabase
    .from('game_progress')
    .upsert(rows, { onConflict: 'user_id,country_slug' })

  if (error) return NextResponse.json({ ok: false }, { status: 500 })
  return NextResponse.json({ ok: true })
}
