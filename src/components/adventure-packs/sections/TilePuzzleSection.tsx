'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import Logo from '@/components/branding/Logo'

const EMPTY = -1

// Grid size is driven by age mode — easier puzzle for younger kids,
// classic 15-puzzle for older. The component keys remount on this
// value so all state recomputes cleanly.
const GRID_FOR_YOUNGER = 3
const GRID_FOR_OLDER = 4

// Lightweight seeded RNG so the initial shuffle is stable across
// reloads when there's no saved game yet.
function makeRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let s = h
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507)
    s = Math.imul(s ^ (s >>> 13), 3266489909)
    s ^= s >>> 16
    return ((s >>> 0) / 4294967295)
  }
}

function emptyIndex(state: readonly number[]): number {
  return state.indexOf(EMPTY)
}

function neighbours(idx: number, gridSize: number): number[] {
  const r = Math.floor(idx / gridSize)
  const c = idx % gridSize
  const out: number[] = []
  if (r > 0)             out.push(idx - gridSize)
  if (r < gridSize - 1)  out.push(idx + gridSize)
  if (c > 0)             out.push(idx - 1)
  if (c < gridSize - 1)  out.push(idx + 1)
  return out
}

function buildSolved(gridSize: number): number[] {
  const n = gridSize * gridSize
  return Array.from({ length: n }, (_, i) => (i < n - 1 ? i : EMPTY))
}

// Build a shuffled state by walking the empty square around the grid
// at random. Guarantees solvability because we only ever do legal
// slides. `avoidLast` keeps us from immediately undoing the previous
// move, so 400 walks actually mix the board instead of jiggling.
function shuffleByRandomMoves(rng: () => number, gridSize: number, moves = 400): number[] {
  const state = buildSolved(gridSize)
  const solved = state.slice()
  let lastEmpty = -1
  for (let i = 0; i < moves; i++) {
    const eIdx = emptyIndex(state)
    const opts = neighbours(eIdx, gridSize).filter(n => n !== lastEmpty)
    const pick = opts[Math.floor(rng() * opts.length)]
    state[eIdx] = state[pick]
    state[pick] = EMPTY
    lastEmpty = eIdx
  }
  // Vanishingly unlikely, but if we wound up solved, walk once more.
  if (state.every((v, i) => v === solved[i])) return shuffleByRandomMoves(rng, gridSize, moves)
  return state
}

// Per-tile equivalence + per-tile "is this essentially one solid colour?"
// + the colour to render for the latter. See computeFlagEquivalence.
type EquivalenceResult = {
  groups: number[]                    // tileId → equivalence group
  pureColours: (string | null)[]      // tileId → rgb(…) when solid, else null
}

// Solved-check that respects visual equivalence in two ways:
//
//  1. Two real tiles in the same equivalence group are interchangeable
//     (all four blue tiles in France's left column are the "same").
//  2. The empty slot is treated as visually equivalent to whatever
//     slice would sit at the BOTTOM-RIGHT in the solved flag (where
//     the empty lives in the solved state). For flags like Nepal where
//     the bottom-right is transparent and SO ARE several other tiles,
//     this means the kid can leave the empty in any one of those
//     transparent positions and the puzzle still registers as solved
//     — provided position 15 itself ends up filled with something that
//     looks like the bottom-right slice.
//
// For emblem flags (USA, UK) where the bottom-right slice is unique,
// no other position is equivalent and the empty must still end at 15.
function isVisuallySolved(
  state: readonly number[],
  eq: EquivalenceResult | null,
  gridSize: number,
  solved: readonly number[],
): boolean {
  if (!eq) {
    return state.every((v, i) => v === solved[i])
  }
  const last = gridSize * gridSize - 1
  const targetGroup = eq.groups[last]
  for (let pos = 0; pos < state.length; pos++) {
    const here = state[pos]
    const expected = solved[pos]
    const hereGroup    = here     === EMPTY ? targetGroup : eq.groups[here]
    const expectedGroup = expected === EMPTY ? targetGroup : eq.groups[expected]
    if (hereGroup !== expectedGroup) return false
  }
  return true
}

function isValidSavedState(s: unknown, expectedLength: number): s is number[] {
  if (!Array.isArray(s) || s.length !== expectedLength) return false
  const sorted = [...s].sort((a, b) => a - b)
  if (sorted[0] !== EMPTY) return false
  for (let i = 1; i < sorted.length; i++) if (sorted[i] !== i - 1) return false
  return true
}

// Sample the flag's actual pixels to figure out:
//  • Which tile regions render identically (equivalence groups). Stripe
//    flags like France collapse 4 columns into 4 groups; emblem flags
//    like the UK stay as 16 unique tiles.
//  • Per-tile "is this essentially one solid colour?" + that colour.
//    If 92%+ of a tile's sampled pixels fall in the same colour bucket
//    we snap the tile to that colour for both rendering and equivalence
//    — so a near-blank tile with one or two stray pixels (e.g. a tiny
//    corner of Nepal's white pennant against the dark blue field) shows
//    as a clean solid blue and groups with the other solid-blue tiles.
//
// PNG download is small (~5KB at w160), and we only do it once per mount.
async function computeFlagEquivalence(iso2: string, gridSize: number): Promise<EquivalenceResult> {
  const url = `https://flagcdn.com/w160/${iso2.toLowerCase()}.png`
  const PURE_THRESHOLD = 0.92
  const BUCKET_SHIFT = 4

  return new Promise<EquivalenceResult>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      try {
        const W = img.naturalWidth || 160
        const H = img.naturalHeight || Math.round((W * 2) / 3)
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) { reject(new Error('no canvas context')); return }
        ctx.drawImage(img, 0, 0, W, H)
        const all = ctx.getImageData(0, 0, W, H).data
        const tileW = W / gridSize
        const tileH = H / gridSize
        const SAMPLES = 6
        const sigToGroup = new Map<string, number>()
        const groups: number[] = []
        const pureColours: (string | null)[] = []

        for (let i = 0; i < gridSize * gridSize; i++) {
          const col = i % gridSize
          const row = Math.floor(i / gridSize)
          const samples: number[][] = []
          for (let sy = 0; sy < SAMPLES; sy++) {
            for (let sx = 0; sx < SAMPLES; sx++) {
              const px = Math.min(W - 1, Math.floor(col * tileW + (sx + 0.5) * tileW / SAMPLES))
              const py = Math.min(H - 1, Math.floor(row * tileH + (sy + 0.5) * tileH / SAMPLES))
              const o = (py * W + px) * 4
              samples.push([all[o], all[o + 1], all[o + 2]])
            }
          }
          const bucketCounts = new Map<string, number>()
          for (const [r, g, b] of samples) {
            const key = `${r >> BUCKET_SHIFT},${g >> BUCKET_SHIFT},${b >> BUCKET_SHIFT}`
            bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1)
          }
          let dominantKey = ''
          let dominantCount = 0
          for (const [key, count] of bucketCounts) {
            if (count > dominantCount) { dominantKey = key; dominantCount = count }
          }
          const dominantRatio = dominantCount / samples.length

          let sig: string
          if (dominantRatio >= PURE_THRESHOLD) {
            let sR = 0, sG = 0, sB = 0, n = 0
            for (const [r, g, b] of samples) {
              const key = `${r >> BUCKET_SHIFT},${g >> BUCKET_SHIFT},${b >> BUCKET_SHIFT}`
              if (key === dominantKey) { sR += r; sG += g; sB += b; n++ }
            }
            pureColours.push(`rgb(${Math.round(sR / n)}, ${Math.round(sG / n)}, ${Math.round(sB / n)})`)
            sig = `pure:${dominantKey}`
          } else {
            pureColours.push(null)
            sig = samples.map(([r, g, b]) => `${r >> BUCKET_SHIFT}.${g >> BUCKET_SHIFT}.${b >> BUCKET_SHIFT}`).join(',')
          }
          let group = sigToGroup.get(sig)
          if (group === undefined) {
            group = sigToGroup.size
            sigToGroup.set(sig, group)
          }
          groups.push(group)
        }
        resolve({ groups, pureColours })
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('flag image load failed'))
    img.src = url
  })
}

function flagUrl(iso2: string): string {
  return `https://flagcdn.com/${iso2.toLowerCase()}.svg`
}

type Props = { data: AdventurePackData; pack: PackHook }

export default function TilePuzzleSection(props: Props) {
  // Re-mount on age change so all GRID-dependent state recomputes
  // cleanly without juggling separate saves. The two grid sizes save
  // under distinct keys so flipping back doesn't lose either game.
  return <PuzzleInner key={props.pack.ageMode} {...props} />
}

function PuzzleInner({ data, pack }: Props) {
  const GRID = pack.ageMode === 'younger' ? GRID_FOR_YOUNGER : GRID_FOR_OLDER
  const TILES = GRID * GRID
  const solvedRef = useMemo(() => buildSolved(GRID), [GRID])
  const seed = `${data.slug}-tile-${GRID}`
  const url = flagUrl(data.iso2)
  const stateKey = `state-${GRID}`
  const movesKey = `moves-${GRID}`

  const [state, setState] = useState<number[]>(() => {
    const saved = pack.getAnswer<unknown>('tilepuzzle', stateKey, null)
    if (isValidSavedState(saved, TILES)) return saved
    return shuffleByRandomMoves(makeRng(seed), GRID)
  })
  const [moves, setMoves] = useState<number>(() => {
    const saved = pack.getAnswer<number>('tilepuzzle', movesKey, 0)
    return typeof saved === 'number' && saved >= 0 ? saved : 0
  })

  // Snapshot the initial state once so a fresh shuffle survives a
  // reload even if the kid never moved anything.
  const didMount = useRef(false)
  useEffect(() => {
    if (didMount.current) return
    didMount.current = true
    pack.updateAnswer('tilepuzzle', stateKey, state)
    pack.updateAnswer('tilepuzzle', movesKey, moves)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [equivalence, setEquivalence] = useState<EquivalenceResult | null>(null)
  useEffect(() => {
    let cancelled = false
    computeFlagEquivalence(data.iso2, GRID)
      .then(eq => { if (!cancelled) setEquivalence(eq) })
      .catch(() => { /* silent fallback */ })
    return () => { cancelled = true }
  }, [data.iso2, GRID])

  // Rare: initial shuffle happens to be visually solved. Once
  // equivalence loads, detect that and reshuffle — only if the kid
  // hasn't moved yet, so we never disrupt a game in progress.
  const reshuffleCheckedRef = useRef(false)
  useEffect(() => {
    if (!equivalence || reshuffleCheckedRef.current) return
    reshuffleCheckedRef.current = true
    if (moves === 0 && isVisuallySolved(state, equivalence, GRID, solvedRef)) {
      const fresh = shuffleByRandomMoves(makeRng(`${seed}-${Date.now()}`), GRID)
      setState(fresh)
      pack.updateAnswer('tilepuzzle', stateKey, fresh)
    }
  }, [equivalence, moves, state, pack, seed, GRID, solvedRef, stateKey])

  const solved = isVisuallySolved(state, equivalence, GRID, solvedRef)
  const missionDone = pack.isMissionComplete('tilepuzzle')

  useEffect(() => {
    if (solved && !missionDone) pack.completeMission('tilepuzzle')
  }, [solved, missionDone, pack])

  const eIdx = emptyIndex(state)
  const movableSet = new Set(solved ? [] : neighbours(eIdx, GRID))

  const tryMove = (idx: number) => {
    if (solved || !movableSet.has(idx)) return
    const next = [...state]
    next[eIdx] = next[idx]
    next[idx] = EMPTY
    const nextMoves = moves + 1
    setState(next)
    setMoves(nextMoves)
    pack.updateAnswer('tilepuzzle', stateKey, next)
    pack.updateAnswer('tilepuzzle', movesKey, nextMoves)
  }

  const reshuffle = () => {
    const fresh = shuffleByRandomMoves(makeRng(`${seed}-${Date.now()}`), GRID)
    setState(fresh)
    setMoves(0)
    pack.updateAnswer('tilepuzzle', stateKey, fresh)
    pack.updateAnswer('tilepuzzle', movesKey, 0)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 leading-relaxed">
        Slide the tiles to rebuild the <strong>{data.country}</strong> flag. Tap any tile next to the empty square to slide it in. Keep going until the flag is whole again.
      </p>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 ${
          solved ? 'bg-emerald-100 text-emerald-800' : 'bg-sand-50 text-gray-700 border border-gray-100'
        }`}>
          <span aria-hidden>🧩</span>
          <span>
            {moves} {moves === 1 ? 'move' : 'moves'}
            {solved && ' · solved!'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Goal</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`${data.country} flag`}
            className="h-6 rounded-sm shadow-sm border border-gray-200"
          />
        </div>
      </div>

      <div
        className="mx-auto grid select-none touch-manipulation bg-sand-100 p-1.5 rounded-xl border border-gray-200"
        style={{
          gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${GRID}, minmax(0, 1fr))`,
          gap: '4px',
          maxWidth: 'min(100%, 22rem)',
          aspectRatio: '3 / 2',
        }}
      >
        {state.map((tile, pos) => {
          if (tile === EMPTY) {
            // On solve, fill the empty slot with the slice that
            // belongs at this specific position (NOT always bottom-
            // right) — for flags like Nepal where the empty can end up
            // at any visually-equivalent slot, this keeps the picture
            // looking right wherever the empty landed.
            if (solved) {
              const sRow = Math.floor(pos / GRID)
              const sCol = pos % GRID
              return (
                <div
                  key={pos}
                  className="rounded-md overflow-hidden shadow-sm ring-2 ring-emerald-400"
                  style={{
                    backgroundImage: `url(${url})`,
                    backgroundSize: `${GRID * 100}% ${GRID * 100}%`,
                    backgroundPosition: `${(sCol / Math.max(1, GRID - 1)) * 100}% ${(sRow / Math.max(1, GRID - 1)) * 100}%`,
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              )
            }
            return (
              <div
                key={pos}
                className="rounded-md bg-brand-50 border border-brand-200/60 flex items-center justify-center p-1.5 overflow-hidden min-h-0 min-w-0"
                aria-label="Empty space"
              >
                <Logo variant="mono" height={18} className="opacity-50 max-h-full w-auto" ariaLabel="" />
              </div>
            )
          }
          const row = Math.floor(tile / GRID)
          const col = tile % GRID
          const movable = movableSet.has(pos)
          const pureColour = equivalence?.pureColours[tile] ?? null
          const tileStyle = pureColour
            ? { backgroundColor: pureColour }
            : {
                backgroundImage: `url(${url})`,
                backgroundSize: `${GRID * 100}% ${GRID * 100}%`,
                backgroundPosition: `${(col / Math.max(1, GRID - 1)) * 100}% ${(row / Math.max(1, GRID - 1)) * 100}%`,
                backgroundRepeat: 'no-repeat' as const,
              }
          return (
            <button
              key={pos}
              type="button"
              onClick={() => tryMove(pos)}
              disabled={!movable}
              aria-label={`Tile ${tile + 1}${movable ? ', tap to slide' : ''}`}
              className={`rounded-md overflow-hidden shadow-sm transition-transform ${
                movable
                  ? 'cursor-pointer hover:scale-[0.97] active:scale-90 ring-1 ring-brand-300'
                  : 'cursor-default ring-1 ring-gray-200'
              } ${solved ? '!ring-2 !ring-emerald-400' : ''}`}
              style={tileStyle}
            />
          )
        })}
      </div>

      <div className="pt-1 flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={reshuffle}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-700 px-3 py-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Shuffle again
        </button>
        <p className="text-xs text-gray-400">
          {pack.ageMode === 'younger'
            ? 'Younger kids mode — 9 tiles. Toggle to older for the full 16-tile puzzle.'
            : 'Older kids mode — 16 tiles. Toggle to younger for the easier 9-tile puzzle.'}
        </p>
      </div>
    </div>
  )
}
