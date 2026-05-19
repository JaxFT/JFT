// Renders a passport-stamp outline as an SVG element, with no fill
// and a built-in "distress" filter (fractal noise + displacement) so
// the line reads like inked-onto-paper rather than a CAD drawing.
//
// Stamp text + emoji are rendered OUTSIDE this component, layered on
// top of it, so they can overflow the shape's edges (e.g. the wider
// "Continents" label sticking out past a star's points).

import { useId } from 'react'
import type { StampShape } from '@/lib/passport-milestones'

type Props = {
  shape: StampShape
  ink: string
  // Outer width / height of the SVG canvas in px.
  w: number
  h: number
}

// SVG path strings inside a 100x100 viewBox. The container scales
// (via preserveAspectRatio="none") so any ratio of w/h works.
const SHAPE_PATHS: Record<string, string> = {
  shield:   'M50 3 L97 18 L97 60 Q97 75 75 88 L50 97 L25 88 Q3 75 3 60 L3 18 Z',
  star:     'M50 4 L61 36 L96 36 L68 57 L79 92 L50 70 L21 92 L32 57 L4 36 L39 36 Z',
  // Rough Africa silhouette — recognisable without being precise.
  africa:   'M55 5 C70 6 80 16 82 30 C84 42 82 50 78 56 C76 62 72 70 70 76 C66 88 55 96 47 95 C36 94 30 84 28 76 C24 66 24 56 26 46 C28 36 30 26 36 16 C42 8 48 4 55 5 Z',
  // Distinctive but not literal silhouettes for the others.
  europe:   'M14 22 L34 12 L54 18 L72 12 L92 22 L90 50 L96 60 L82 70 L72 80 L58 86 L42 86 L28 80 L14 70 L18 58 L10 50 L14 22 Z',
  asia:     'M10 28 L40 8 L70 14 L92 22 L94 46 L88 62 L78 78 L60 90 L42 92 L26 82 L14 64 L6 50 L10 28 Z',
  americas: 'M44 5 L62 10 L60 22 L70 32 L66 46 L74 60 L66 76 L58 92 L48 96 L40 88 L46 76 L36 68 L34 54 L26 44 L36 36 L36 22 L44 5 Z',
  oceania:  'M30 35 L48 28 L70 32 L84 50 L80 70 L62 78 L40 74 L24 60 L20 48 L30 35 Z',
  antarctica:'M8 50 L22 42 L40 44 L60 42 L78 44 L92 50 L90 62 L74 70 L60 72 L42 72 L22 68 L10 62 L8 50 Z',
}

export default function StampOutline({ shape, ink, w, h }: Props) {
  // Unique filter id per component instance so multiple stamps on the
  // page don't collide via the same SVG defs id.
  const filterId = useId().replace(/[:]/g, '')
  const distressId = `distress-${filterId}`
  const inkSpreadId = `inkspread-${filterId}`

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    >
      <defs>
        {/* Fractal-noise displacement makes the stroke wobble like
            real ink on absorbent paper. */}
        <filter id={distressId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="2.8" />
        </filter>
        {/* A second pass for an "ink spread" feel — thicker, fainter
            halo around the stroke. */}
        <filter id={inkSpreadId} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      {/* Faint halo of ink under the main stroke for extra depth. */}
      <Shape shape={shape} stroke={ink} strokeWidth={2.5} opacity={0.35} filter={`url(#${inkSpreadId})`} />
      {/* Main distressed outline. */}
      <Shape shape={shape} stroke={ink} strokeWidth={1.3} filter={`url(#${distressId})`} />
    </svg>
  )
}

function Shape({
  shape,
  stroke,
  strokeWidth,
  opacity,
  filter,
}: {
  shape: StampShape
  stroke: string
  strokeWidth: number
  opacity?: number
  filter?: string
}) {
  const common = {
    stroke,
    strokeWidth,
    fill: 'none',
    strokeLinejoin: 'round' as const,
    opacity,
    filter,
  }
  if (shape === 'circle')  return <circle cx="50" cy="50" r="44" {...common} />
  if (shape === 'oval')    return <ellipse cx="50" cy="50" rx="46" ry="32" {...common} />
  if (shape === 'rounded') return <rect x="6" y="14" width="88" height="72" rx="14" {...common} />
  if (shape === 'flag')    return <rect x="6" y="10" width="88" height="80" rx="3" {...common} />
  const d = SHAPE_PATHS[shape]
  if (d) return <path d={d} {...common} />
  // Fallback
  return <circle cx="50" cy="50" r="44" {...common} />
}
