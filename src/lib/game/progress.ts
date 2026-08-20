import { COUNTRIES, nextCountry } from './countries'
import type { GameProgress } from './types'

const STORAGE_KEY = 'jft_game_progress_v1'

export function defaultProgress(): GameProgress {
  const progress: GameProgress = {}
  COUNTRIES.forEach((c, i) => {
    progress[c.slug] = { bestScore: 0, unlocked: i === 0, passportStamp: false }
  })
  return progress
}

// Client-only. Reads localStorage and fills in any country the stored
// blob doesn't know about yet (e.g. a new country shipped since the
// player last visited).
export function loadLocalProgress(): GameProgress {
  const base = defaultProgress()
  if (typeof window === 'undefined') return base
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const stored = JSON.parse(raw) as GameProgress
    for (const slug of Object.keys(base)) {
      if (stored[slug]) base[slug] = stored[slug]
    }
    return base
  } catch {
    return base
  }
}

export function saveLocalProgress(progress: GameProgress) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {}
}

// Combines local + server progress, keeping the best of each per
// country so neither a stale device nor a stale server row can lose
// a player's unlock/stamp/best score.
export function mergeProgress(a: GameProgress, b: GameProgress): GameProgress {
  const merged = defaultProgress()
  for (const slug of Object.keys(merged)) {
    const x = a[slug]
    const y = b[slug]
    merged[slug] = {
      bestScore: Math.max(x?.bestScore ?? 0, y?.bestScore ?? 0),
      unlocked: Boolean(x?.unlocked) || Boolean(y?.unlocked),
      passportStamp: Boolean(x?.passportStamp) || Boolean(y?.passportStamp),
    }
  }
  return merged
}

export type LevelResultOutcome = {
  progress: GameProgress
  isNewBest: boolean
  newlyStamped: boolean
  newlyUnlockedSlug?: string
}

export function applyResult(progress: GameProgress, slug: string, score: number): LevelResultOutcome {
  const next = { ...progress, [slug]: { ...progress[slug] } }
  const entry = next[slug] ?? { bestScore: 0, unlocked: true, passportStamp: false }
  const isNewBest = score > entry.bestScore
  const newlyStamped = !entry.passportStamp
  next[slug] = {
    bestScore: Math.max(entry.bestScore, score),
    unlocked: true,
    passportStamp: true,
  }

  let newlyUnlockedSlug: string | undefined
  const upcoming = nextCountry(slug)
  if (upcoming && !next[upcoming.slug]?.unlocked) {
    next[upcoming.slug] = {
      bestScore: next[upcoming.slug]?.bestScore ?? 0,
      unlocked: true,
      passportStamp: next[upcoming.slug]?.passportStamp ?? false,
    }
    newlyUnlockedSlug = upcoming.slug
  }

  return { progress: next, isNewBest, newlyStamped, newlyUnlockedSlug }
}

// Fire-and-forget sync for logged-in users. Silently no-ops for
// anonymous players (the API route 401s and we just ignore it) so the
// game never requires an account, per the brief.
export function syncProgressToServer(progress: GameProgress) {
  fetch('/api/game/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress }),
  }).catch(() => {})
}
