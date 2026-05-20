'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'

const GRID = 4
const TILES = GRID * GRID  // 16
const EMPTY = -1

// Solved state: tile values 0..14 fill positions 0..14, position 15
// is the empty square. Tile value === its solved-state position, so
// the value also tells us which slice of the flag the tile shows.
const SOLVED: readonly number[] = Object.freeze(
  Array.from({ length: TILES }, (_, i) => (i < TILES - 1 ? i : EMPTY)),
)

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

function neighbours(idx: number): number[] {
  const r = Math.floor(idx / GRID)
  const c = idx % GRID
  const out: number[] = []
  if (r > 0)         out.push(idx - GRID)
  if (r < GRID - 1)  out.push(idx + GRID)
  if (c > 0)         out.push(idx - 1)
  if (c < GRID - 1)  out.push(idx + 1)
  return out
}

// Build a shuffled state by walking the empty square around the grid
// at random. Guarantees solvability because we only ever do legal
// slides. `avoidLast` keeps us from immediately undoing the previous
// move, so 400 walks actually mix the board instead of jiggling.
function shuffleByRandomMoves(rng: () => number, moves = 400): number[] {
  const state: number[] = [...SOLVED]
  let lastEmpty = -1
  for (let i = 0; i < moves; i++) {
    const eIdx = emptyIndex(state)
    const opts = neighbours(eIdx).filter(n => n !== lastEmpty)
    const pick = opts[Math.floor(rng() * opts.length)]
    state[eIdx] = state[pick]
    state[pick] = EMPTY
    lastEmpty = eIdx
  }
  // Vanishingly unlikely, but if we wound up solved, walk once more.
  if (state.every((v, i) => v === SOLVED[i])) return shuffleByRandomMoves(rng, moves)
  return state
}

function isSolved(state: readonly number[]): boolean {
  return state.every((v, i) => v === SOLVED[i])
}

function isValidSavedState(s: unknown): s is number[] {
  if (!Array.isArray(s) || s.length !== TILES) return false
  const sorted = [...s].sort((a, b) => a - b)
  if (sorted[0] !== EMPTY) return false
  for (let i = 1; i < sorted.length; i++) if (sorted[i] !== i - 1) return false
  return true
}

// flagcdn.com is what the rest of the project already uses (CountryFlag,
// FlagBanner). SVG scales cleanly to whatever tile size the grid lands
// at on the current viewport.
function flagUrl(iso2: string): string {
  return `https://flagcdn.com/${iso2.toLowerCase()}.svg`
}

export default function TilePuzzleSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const seed = `${data.slug}-tile`
  const url = flagUrl(data.iso2)

  // Restore from save if there's a valid one, otherwise generate a
  // fresh deterministic shuffle. Lazy init only runs once — after
  // mount this component owns the state.
  const [state, setState] = useState<number[]>(() => {
    const saved = pack.getAnswer<unknown>('tilepuzzle', 'state', null)
    if (isValidSavedState(saved)) return saved
    return shuffleByRandomMoves(makeRng(seed))
  })
  const [moves, setMoves] = useState<number>(() => {
    const saved = pack.getAnswer<number>('tilepuzzle', 'moves', 0)
    return typeof saved === 'number' && saved >= 0 ? saved : 0
  })

  // Snapshot the initial state on mount so the freshly-generated
  // shuffle survives a reload even if the kid never actually moved a
  // tile. The pack hook is stable across renders for this purpose.
  const didMount = useRef(false)
  useEffect(() => {
    if (didMount.current) return
    didMount.current = true
    pack.updateAnswer('tilepuzzle', 'state', state)
    pack.updateAnswer('tilepuzzle', 'moves', moves)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const solved = isSolved(state)
  const missionDone = pack.isMissionComplete('tilepuzzle')

  useEffect(() => {
    if (solved && !missionDone) pack.completeMission('tilepuzzle')
  }, [solved, missionDone, pack])

  const eIdx = emptyIndex(state)
  const movableSet = new Set(solved ? [] : neighbours(eIdx))

  const tryMove = (idx: number) => {
    if (solved || !movableSet.has(idx)) return
    const next = [...state]
    next[eIdx] = next[idx]
    next[idx] = EMPTY
    const nextMoves = moves + 1
    setState(next)
    setMoves(nextMoves)
    pack.updateAnswer('tilepuzzle', 'state', next)
    pack.updateAnswer('tilepuzzle', 'moves', nextMoves)
  }

  const reshuffle = () => {
    // Per-shuffle seed so the kid gets a different board every replay.
    const fresh = shuffleByRandomMoves(makeRng(`${seed}-${Date.now()}`))
    setState(fresh)
    setMoves(0)
    pack.updateAnswer('tilepuzzle', 'state', fresh)
    pack.updateAnswer('tilepuzzle', 'moves', 0)
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
          gap: '4px',
          maxWidth: 'min(100%, 22rem)',
          aspectRatio: '3 / 2',
        }}
      >
        {state.map((tile, pos) => {
          if (tile === EMPTY) {
            // On solve, fill the empty corner with the missing slice
            // so the kid sees the whole flag rather than a hole at
            // the bottom-right. Position 15's slice is the bottom-
            // right corner — 100% / 100% on the background grid.
            if (solved) {
              return (
                <div
                  key={pos}
                  className="rounded-md overflow-hidden shadow-sm ring-2 ring-emerald-400"
                  style={{
                    backgroundImage: `url(${url})`,
                    backgroundSize: `${GRID * 100}% ${GRID * 100}%`,
                    backgroundPosition: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              )
            }
            return (
              <div
                key={pos}
                className="rounded-md border border-dashed border-gray-300/70 bg-sand-50"
              />
            )
          }
          const row = Math.floor(tile / GRID)
          const col = tile % GRID
          const movable = movableSet.has(pos)
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
              style={{
                backgroundImage: `url(${url})`,
                backgroundSize: `${GRID * 100}% ${GRID * 100}%`,
                backgroundPosition: `${(col / (GRID - 1)) * 100}% ${(row / (GRID - 1)) * 100}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          )
        })}
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={reshuffle}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-700 px-3 py-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Shuffle again
        </button>
      </div>
    </div>
  )
}
