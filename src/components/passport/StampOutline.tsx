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
  shield:    'M50 4 L94 18 L94 60 Q94 75 75 86 L50 96 L25 86 Q6 75 6 60 L6 18 Z',
  star:      'M50 4 L62 38 L96 38 L68 58 L78 92 L50 72 L22 92 L32 58 L4 38 L38 38 Z',
  // Rough Africa silhouette — recognisable shape without being
  // cartographically perfect.
  africa:    'M55 6 C68 7 78 16 80 28 C82 38 80 47 76 53 C75 60 71 68 70 75 C66 88 56 96 47 94 C38 92 31 84 28 75 C24 64 24 55 27 45 C29 35 31 26 36 17 C42 9 48 5 55 6 Z',
  // Distinct (not literal) silhouettes for the other continents.
  europe:    'M18 22 L34 14 L52 18 L70 12 L88 22 L86 48 L92 60 L78 70 L68 78 L54 84 L42 84 L28 78 L16 70 L20 56 L12 48 L18 22 Z',
  asia:      'M12 30 L40 10 L70 14 L92 24 L94 46 L86 60 L74 76 L58 88 L40 88 L24 78 L14 60 L8 50 L12 30 Z',
  americas:  'M46 6 L62 12 L60 22 L68 32 L62 46 L70 60 L62 76 L54 92 L46 96 L38 88 L46 76 L36 66 L34 54 L26 44 L36 36 L36 22 L46 6 Z',
  oceania:   'M30 36 L48 30 L70 34 L82 50 L78 68 L60 76 L40 72 L24 60 L20 48 L30 36 Z',
  antarctica:'M10 50 L24 44 L40 46 L60 44 L78 46 L92 50 L88 60 L74 66 L60 68 L42 68 L24 64 L12 60 L10 50 Z',
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
