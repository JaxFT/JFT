'use client'

// Scatters its children (stamps) across a passport-page area with a
// stable per-child random rotation + offset. Used by:
//   - the real kid Stamps tab country pages
//   - the marketing mockups on /passports
//
// "Stable" matters: the same seed always produces the same layout,
// so a kid's country page doesn't reshuffle every render and the
// stamps feel like they were inked into the page once.
//
// "Responsive" matters: on a phone, fewer columns + tighter packing
// stop stamps overlapping; on tablet+, more columns spread out.
// We measure the container with ResizeObserver and pick a layout
// per width.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

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
  seed: string
  children: ReactNode
  // Used as a guideline only when a height isn't supplied via the
  // responsive layout. Real height is derived from cols+rows so the
  // sheet grows to fit the number of stamps without clipping.
  height?: number
  // Hint for the size of the stamps being scattered, so the sheet
  // can pick a column count that fits the widest stamp in each cell
  // without overflow. Defaults to 'sm'.
  stampSize?: 'sm' | 'md'
}

// Cell dimensions per stamp size. The widest stamp shape (oval) is
// 1.4 * base wide, so minColWidth = (base * 1.4) + a margin for
// jitter and breathing room. cellH covers the tallest stamp height
// plus a little vertical jitter.
function dimsForStampSize(size: 'sm' | 'md') {
  if (size === 'md') return { minColWidth: 210, cellH: 165 }
  return { minColWidth: 160, cellH: 125 }
}

// Pick how many columns fit, given the container width and the
// per-stamp cell width required. Never less than 1, never more than
// the number of stamps.
function colsFor(width: number, count: number, minColWidth: number): number {
  const possible = Math.max(1, Math.floor(width / minColWidth))
  return Math.min(possible, count)
}

export default function ScatteredStampSheet({ seed, children, height: minHeight = 320, stampSize = 'sm' }: Props) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean)
  const count = items.length

  const containerRef = useRef<HTMLDivElement | null>(null)
  // SSR-safe default. The first client render uses this; ResizeObserver
  // bumps it to the real measured width on mount.
  const [width, setWidth] = useState(360)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => {
    if (count === 0) return { cols: 1, rows: 0, cellH: 0, height: 0 }
    const dims = dimsForStampSize(stampSize)
    const cols = colsFor(width, count, dims.minColWidth)
    const rows = Math.ceil(count / cols)
    const height = Math.max(minHeight, rows * dims.cellH + 24)
    return { cols, rows, cellH: dims.cellH, height }
  }, [width, count, minHeight, stampSize])

  if (count === 0) {
    return <div ref={containerRef} className="relative" style={{ height: minHeight }} aria-hidden />
  }

  const rng = mulberry32(hashSeed(seed))

  return (
    <div ref={containerRef} className="relative w-full mx-auto" style={{ height: layout.height }}>
      {items.map((child, i) => {
        const row = Math.floor(i / layout.cols)
        const col = i % layout.cols
        // Per-stamp jitter and rotation. Pulled back from the old
        // values so larger stamps (md = 138px base) still sit inside
        // their cell on narrow phones rather than bleeding past the
        // cream-paper edge. Edge cells get even less horizontal drift.
        const baseJitter = width < 360 ? 0.18 : width < 520 ? 0.22 : 0.28
        const isEdgeCol = col === 0 || col === layout.cols - 1
        const jitterScale = isEdgeCol ? baseJitter * 0.6 : baseJitter
        const jitterX = (rng() - 0.5) * jitterScale
        const jitterY = (rng() - 0.5) * jitterScale
        const rotate = (rng() - 0.5) * 36
        const cellW = 100 / layout.cols
        const left = (col + 0.5 + jitterX) * cellW
        const top = (row + 0.5 + jitterY) * layout.cellH + 12

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${left}%`,
              top: `${top}px`,
              transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
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
