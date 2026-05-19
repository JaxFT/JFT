// Clean stamp outline rendered as SVG. Real passport stamps have
// crisp lines (often double-ringed) — what makes them look "old" is
// faded ink and uneven pressure, NOT a wobbly border. We do the fade
// via opacity + mix-blend-mode on the parent; the outline itself is
// crisp.
//
// Regular geometric shapes (circle / oval / rounded rect / flag) get
// a classic passport double-line border. Irregular shapes (shield,
// star, continent silhouettes) get a single stroke since a double
// inset of a curvy silhouette looks wrong.

import type { StampShape } from '@/lib/passport-milestones'

type Props = {
  shape: StampShape
  ink: string
  w: number
  h: number
}

// SVG paths in a 100x100 viewBox. preserveAspectRatio="none" so each
// shape can sit at its own width/height ratio without distortion of
// the line weight (strokes are scaled to the smaller axis via
// vector-effect="non-scaling-stroke").
const SHAPE_PATHS: Record<string, string> = {
  shield:  'M50 4 L94 18 L94 60 Q94 75 75 86 L50 96 L25 86 Q6 75 6 60 L6 18 Z',
  star:    'M50 4 L62 38 L96 38 L68 58 L78 92 L50 72 L22 92 L32 58 L4 38 L38 38 Z',
  hexagon: 'M50 4 L92 26 L92 74 L50 96 L8 74 L8 26 Z',
}

const DOUBLE_BORDER_SHAPES = new Set<StampShape>(['circle', 'oval', 'rounded', 'flag'])

export default function StampOutline({ shape, ink, w, h }: Props) {
  const hasDouble = DOUBLE_BORDER_SHAPES.has(shape)

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    >
      {/* Main outer border */}
      <ShapeEl shape={shape} stroke={ink} strokeWidth={1.6} />
      {/* Classic passport double-line: a thinner inner ring just inside
          the main border. Only on regular geometric shapes. */}
      {hasDouble && (
        <ShapeEl shape={shape} stroke={ink} strokeWidth={0.7} inset={5} />
      )}
    </svg>
  )
}

function ShapeEl({
  shape,
  stroke,
  strokeWidth,
  inset = 0,
}: {
  shape: StampShape
  stroke: string
  strokeWidth: number
  inset?: number
}) {
  const common = {
    stroke,
    strokeWidth,
    fill: 'none',
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }
  if (shape === 'circle') {
    return <circle cx="50" cy="50" r={44 - inset} {...common} />
  }
  if (shape === 'oval') {
    return <ellipse cx="50" cy="50" rx={46 - inset} ry={32 - inset * 0.6} {...common} />
  }
  if (shape === 'rounded') {
    return <rect x={6 + inset} y={14 + inset} width={88 - inset * 2} height={72 - inset * 2} rx={Math.max(4, 14 - inset)} {...common} />
  }
  if (shape === 'flag') {
    return <rect x={6 + inset} y={10 + inset} width={88 - inset * 2} height={80 - inset * 2} rx={Math.max(1, 3 - inset * 0.3)} {...common} />
  }
  const d = SHAPE_PATHS[shape]
  if (d) return <path d={d} {...common} />
  return <circle cx="50" cy="50" r="44" {...common} />
}
