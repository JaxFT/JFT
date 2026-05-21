// Scatters its children (stamps) across a passport-page area with a
// stable per-child random rotation + offset. Used by:
//   - the real kid Stamps tab country pages (replaces the old
//     flex-wrap "ScatteredStamps")
//   - the marketing mockups on /passports
//
// "Stable" is important: the same seed always produces the same
// layout, so a kid's country page doesn't reshuffle every render and
// the stamps feel like they were inked into the page once.

import type { ReactNode } from 'react'

// Tiny deterministic PRNG. Mulberry32 — small, fast, good enough for
// "random-looking but reproducible" UI placement. Seed from a string
// by hashing it first.
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return function () {
    t = (t + 0x6D2B79F5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

type Props = {
  // Unique seed for this page, e.g. the country slug. Same seed = same
  // layout across renders. If the array reorders (a new stamp gets
  // inserted) layout shifts only for new positions.
  seed: string
  children: ReactNode
  // Approximate height in px the sheet should reserve. The component
  // computes positions inside this, plus a small margin so stamps
  // near the edge don't get clipped.
  height?: number
}

export default function ScatteredStampSheet({ seed, children, height = 360 }: Props) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean)
  const count = items.length

  if (count === 0) {
    return <div className="relative" style={{ height }} aria-hidden />
  }

  // Build a grid of candidate cells, then perturb each cell with a
  // bit of random jitter. Stops stamps from piling on top of each
  // other while still feeling hand-stamped.
  const rng = mulberry32(hashSeed(seed))
  const cols = count <= 4 ? 2 : count <= 9 ? 3 : 4
  const rows = Math.ceil(count / cols)
  // Reserve a generous bottom margin so the date strip on each stamp
  // never sits flush against the page edge.
  const cellW = 100 / cols                    // %
  const cellH = (height - 32) / rows          // px

  return (
    <div className="relative w-full mx-auto" style={{ height, maxWidth: 540 }}>
      {items.map((child, i) => {
        const row = Math.floor(i / cols)
        const col = i % cols
        // Per-stamp jitter: ±25% of cell on each axis, ±18° rotation.
        const jitterX = (rng() - 0.5) * 0.5
        const jitterY = (rng() - 0.5) * 0.5
        const rotate = (rng() - 0.5) * 36
        const left = (col + 0.5 + jitterX) * cellW
        const top = (row + 0.5 + jitterY) * cellH + 16

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${left}%`,
              top: `${top}px`,
              transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
              // Later stamps stack on top, like fresh ink over old.
              zIndex: i,
            }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}
