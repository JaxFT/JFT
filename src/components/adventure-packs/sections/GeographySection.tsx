'use client'

// Matching game: places (left) and descriptions (right), both shuffled
// on mount. Tap a place → tap a description. Correct match locks them
// both in green; wrong match flashes red briefly then resets.

import { useEffect, useMemo, useState } from 'react'
import type { AdventurePackData, GeoMatch } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'

function shuffle<T>(input: readonly T[]): T[] {
  const arr = input.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

type Tile = { id: string; label: string; emoji?: string; match: string }

export default function GeographySection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const matched = pack.getAnswer<string[]>('geography', 'matched', [])

  const [places, descs] = useMemo(() => {
    const p: Tile[] = data.geoMatches.map(m => ({ id: m.place, label: m.place, emoji: m.emoji, match: m.place }))
    const d: Tile[] = data.geoMatches.map(m => ({ id: `d-${m.place}`, label: m.description, match: m.place }))
    return [shuffle(p), shuffle(d)] as const
  }, [data.geoMatches])

  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)
  const [wrong, setWrong] = useState<{ a: string; b: string } | null>(null)

  useEffect(() => {
    if (!wrong) return
    const t = setTimeout(() => setWrong(null), 600)
    return () => clearTimeout(t)
  }, [wrong])

  const onPick = (kind: 'place' | 'desc', tile: Tile) => {
    if (matched.includes(tile.match)) return
    if (kind === 'place') {
      setSelectedPlace(p => (p === tile.match ? null : tile.match))
      return
    }
    if (!selectedPlace) return
    if (selectedPlace === tile.match) {
      pack.updateAnswer('geography', 'matched', [...matched, tile.match])
      setSelectedPlace(null)
    } else {
      setWrong({ a: selectedPlace, b: tile.match })
      setSelectedPlace(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        Tap a place, then tap its description to match them. Get all {data.geoMatches.length} for a clean sweep.
      </p>
      <p className="text-xs text-brand-700 font-semibold">
        {matched.length} of {data.geoMatches.length} matched
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          {places.map(t => {
            const done = matched.includes(t.match)
            const isSelected = selectedPlace === t.match
            const isWrong = wrong?.a === t.match
            return (
              <button
                key={t.id}
                type="button"
                disabled={done}
                onClick={() => onPick('place', t)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                  done
                    ? 'bg-brand-50 border-brand-200 text-brand-800 opacity-70 cursor-default'
                    : isWrong
                      ? 'bg-red-50 border-red-300 text-red-800'
                      : isSelected
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-sand-50 border-gray-100 text-gray-800 hover:border-brand-300'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            )
          })}
        </div>
        <div className="space-y-2">
          {descs.map(t => {
            const done = matched.includes(t.match)
            const isWrong = wrong?.b === t.match
            return (
              <button
                key={t.id}
                type="button"
                disabled={done}
                onClick={() => onPick('desc', t)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm leading-snug transition-colors ${
                  done
                    ? 'bg-brand-50 border-brand-200 text-brand-800 opacity-70 cursor-default'
                    : isWrong
                      ? 'bg-red-50 border-red-300 text-red-800'
                      : 'bg-sand-50 border-gray-100 text-gray-700 hover:border-brand-300'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
