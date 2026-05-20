'use client'

import { useEffect, useMemo } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'

const GRID_SIZE = 11

// 8 directions: horizontal, vertical, both diagonals, forwards + back.
const DIRS: ReadonlyArray<[number, number]> = [
  [ 0,  1], [ 1,  0], [ 1,  1], [-1,  1],
  [ 0, -1], [-1,  0], [-1, -1], [ 1, -1],
]

// Slug-seeded RNG so each country's grid is stable across visits
// without having to hand-craft and store the grid in data.
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

type Placement = { word: string; r: number; c: number; dr: number; dc: number }

function buildGrid(words: string[], seed: string): { grid: string[][]; placements: Placement[] } {
  const rng = makeRng(seed)
  // Longest words first — they're hardest to fit, so place them while
  // the board is still empty.
  const sorted = [...words].sort((a, b) => b.length - a.length)
  const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () => Array<string | null>(GRID_SIZE).fill(null))
  const placements: Placement[] = []

  for (const raw of sorted) {
    const word = raw.toUpperCase()
    for (let attempt = 0; attempt < 400; attempt++) {
      const [dr, dc] = DIRS[Math.floor(rng() * DIRS.length)]
      const len = word.length
      // Compute the valid start-cell range for this direction so the
      // whole word stays inside the grid.
      const rMin = dr < 0 ? len - 1 : 0
      const rMax = dr > 0 ? GRID_SIZE - len : GRID_SIZE - 1
      const cMin = dc < 0 ? len - 1 : 0
      const cMax = dc > 0 ? GRID_SIZE - len : GRID_SIZE - 1
      const r = rMin + Math.floor(rng() * (rMax - rMin + 1))
      const c = cMin + Math.floor(rng() * (cMax - cMin + 1))
      // Allow letter sharing where existing cell matches — that's
      // the whole charm of a word search.
      let ok = true
      for (let i = 0; i < len; i++) {
        const cur = grid[r + i * dr][c + i * dc]
        if (cur !== null && cur !== word[i]) { ok = false; break }
      }
      if (!ok) continue
      for (let i = 0; i < len; i++) grid[r + i * dr][c + i * dc] = word[i]
      placements.push({ word, r, c, dr, dc })
      break
    }
  }

  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const out: string[][] = Array.from({ length: GRID_SIZE }, (_, r) =>
    Array.from({ length: GRID_SIZE }, (_, c) =>
      grid[r][c] ?? ALPHA[Math.floor(rng() * 26)]))
  return { grid: out, placements }
}

const cellKey = (r: number, c: number) => `${r},${c}`

export default function WordSearchSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const ws = data.wordSearch
  if (!ws) {
    return (
      <p className="text-sm text-gray-500 italic">
        Word search for {data.country} is coming soon.
      </p>
    )
  }

  const { grid, placements } = useMemo(
    () => buildGrid(ws.words, data.slug),
    [ws.words, data.slug],
  )

  // Coloured cells survive across sessions via the pack's answers
  // blob, the same mechanism every other section uses.
  const savedTaps = pack.getAnswer<string[]>('wordsearch', 'tapped', [])
  const coloured = useMemo(() => new Set(savedTaps), [savedTaps])

  // A word is "found" when every cell on its placed path is coloured.
  // Kids can find words by accident if they happen to colour the
  // right pattern — that's a feature, not a bug, in a kids' puzzle.
  const foundSet = useMemo(() => {
    const found = new Set<string>()
    for (const p of placements) {
      let all = true
      for (let i = 0; i < p.word.length; i++) {
        if (!coloured.has(cellKey(p.r + i * p.dr, p.c + i * p.dc))) { all = false; break }
      }
      if (all) found.add(p.word)
    }
    return found
  }, [coloured, placements])

  // Cells that sit on a found word's path get the green "solved"
  // styling, regardless of what else the kid has tapped around them.
  const foundCells = useMemo(() => {
    const out = new Set<string>()
    for (const p of placements) {
      if (!foundSet.has(p.word)) continue
      for (let i = 0; i < p.word.length; i++) {
        out.add(cellKey(p.r + i * p.dr, p.c + i * p.dc))
      }
    }
    return out
  }, [placements, foundSet])

  const allFound = foundSet.size === placements.length && placements.length > 0
  const missionDone = pack.isMissionComplete('wordsearch')

  // Auto-complete the mission the moment the kid finds every word.
  // The header's manual button remains available as a fallback if a
  // family wants to skip the puzzle.
  useEffect(() => {
    if (allFound && !missionDone) pack.completeMission('wordsearch')
  }, [allFound, missionDone, pack])

  const toggle = (r: number, c: number) => {
    const key = cellKey(r, c)
    const next = new Set(coloured)
    if (next.has(key)) next.delete(key); else next.add(key)
    pack.updateAnswer('wordsearch', 'tapped', Array.from(next))
  }

  const reset = () => {
    pack.updateAnswer('wordsearch', 'tapped', [])
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 leading-relaxed">
        {ws.hint} Tap each letter to colour it in. Find all <strong>{placements.length}</strong> words hiding in the grid — left, right, up, down, or diagonal.
      </p>

      <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 ${
        allFound
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-sand-50 text-gray-700 border border-gray-100'
      }`}>
        <span aria-hidden>🔠</span>
        <span>
          {foundSet.size} / {placements.length} words found
          {allFound && ' · nice work!'}
        </span>
      </div>

      {/* GRID */}
      <div
        className="mx-auto grid select-none touch-manipulation"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          maxWidth: 'min(100%, 26rem)',
          gap: '3px',
        }}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = cellKey(r, c)
            const isFound = foundCells.has(key)
            const isColoured = coloured.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(r, c)}
                aria-label={`Letter ${letter} at row ${r + 1} column ${c + 1}${isFound ? ', part of a found word' : isColoured ? ', coloured' : ''}`}
                aria-pressed={isColoured}
                className={`aspect-square flex items-center justify-center text-[0.78rem] sm:text-sm font-bold rounded-md transition-colors ${
                  isFound
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : isColoured
                      ? 'bg-amber-300 text-amber-900'
                      : 'bg-sand-50 text-gray-800 border border-gray-100 hover:border-brand-200 hover:bg-white'
                }`}
              >
                {letter}
              </button>
            )
          })
        )}
      </div>

      {/* WORD LIST */}
      <div>
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Words to find</p>
        <ul className="flex flex-wrap gap-2">
          {ws.words.map(word => {
            const upper = word.toUpperCase()
            const found = foundSet.has(upper)
            return (
              <li
                key={word}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold transition-all ${
                  found
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 line-through decoration-2'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {found && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                {upper}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={reset}
          disabled={coloured.size === 0}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Clear the grid
        </button>
      </div>
    </div>
  )
}
