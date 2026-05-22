// Passport-stamp graphic for the 18 system stamp types.
//
// Real-customs-stamp look: distressed ink (decorative parts only,
// so text stays crisp), double ring with a dot ring between them,
// curved typography on the rings, a monospace date strip across the
// middle, and the stamp emoji as the focal motif inside the inner
// ring. Rendered in SVG so it scales cleanly at any size and so the
// distress filter can carve broken-ink patches via feTurbulence.
//
// Used everywhere stamps appear: the kid's passport, country pages,
// the parent-side stamps management, and the public stamps catalogue.

import { STAMP_META, type StampType } from '@/lib/passport-types'
import type { StampShape } from '@/lib/passport-milestones'

// PassportStamp can be driven two ways:
//   1. By `type` — looks up STAMP_META for label/emoji/ink and
//      SHAPE_FOR_TYPE for shape. Used by the 18 system stamps.
//   2. By explicit overrides `{ label, emoji, ink, shape }` — used by
//      milestone badges and custom kid/parent-created stamps.
// Callers must provide one or the other; passing `type` plus an
// override lets the override win for that field.
type Props = {
  type?: StampType
  label?: string
  emoji?: string
  ink?: string
  shape?: StampShape
  country?: string | null
  date?: string | null
  rotate?: number
  size?: 'sm' | 'md'
}

// CUSTOM stamps get their shape from the row's custom_shape column.
// The placeholder 'circle' entry here is only used when something
// looks up SHAPE_FOR_TYPE['CUSTOM'] without supplying a real shape
// override — render code should always pass the row's custom_shape.
const SHAPE_FOR_TYPE: Record<StampType, StampShape> = {
  BRAVE_EATER:             'circle',
  LOCAL_LINGO:             'oval',
  STEP_CHAMP:              'rounded',
  ADVENTURE_PACK_COMPLETE: 'hexagon',
  EXPLORER_DAY:            'shield',
  CULTURE_SPOTTER:         'rounded',
  NATURE_LOVER:            'oval',
  BRAVE_TRAVELLER:         'shield',
  WATER_ADVENTURER:        'oval',
  EARLY_BIRD:              'circle',
  MAP_READER:              'rounded',
  MONEY_CHANGER:           'circle',
  GEOGRAPHY_GENIUS:        'shield',
  SCAVENGER_HUNTER:        'circle',
  ANIMAL_SPOTTER:          'oval',
  SENSE_SEEKER:            'oval',
  STORY_KEEPER:            'rounded',
  FAMILY_CHATTERBOX:       'circle',
  CUSTOM:                  'circle',
}

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function rotationFor(seed: string): number {
  return (hashSeed(seed) % 13) - 6
}

function formatDateLine(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()
}

// Step down the curved/straight label font as the label gets longer
// so the text stays inside the stamp face. Tuned for the SVG viewBox
// dimensions used by each shape family; the values were picked by
// eyeballing the breakpoints where letters first start clipping or
// overlapping on a default-rendered Georgia letterform.
function shrinkFor(label: string, base: number, step: number, min: number): number {
  const len = label.length
  if (len <= 12) return base
  if (len <= 16) return base - step
  if (len <= 22) return Math.max(min, base - step * 2)
  return min
}

function pxFor(shape: StampShape, size: 'sm' | 'md') {
  // sm base: tuned to 78 so a Global Stamps page packed with 20+
  // stamps + milestones fits within the book frame without endless
  // scrolling. Still readable at this size; the dense grid layout
  // on Global Stamps overlaps stamps slightly for the pile feel.
  const base = size === 'md' ? 138 : 78
  if (shape === 'oval')    return { w: base * 1.4,  h: base * 0.9 }
  if (shape === 'rounded') return { w: base * 1.3,  h: base * 0.92 }
  if (shape === 'flag')    return { w: base * 1.15, h: base }
  if (shape === 'shield')  return { w: base * 0.95, h: base * 1.05 }
  if (shape === 'star')    return { w: base * 1.05, h: base * 1.05 }
  if (shape === 'hexagon') return { w: base * 1.1,  h: base * 0.95 }
  return { w: base, h: base }
}

export default function PassportStamp(props: Props) {
  const { type, country, date, rotate, size = 'md' } = props
  // Resolve content: explicit override props win; fall back to
  // STAMP_META if a type was provided. CUSTOM stamps will hit the
  // placeholder STAMP_META.CUSTOM entry if no overrides are passed,
  // which is intentional — the caller (PassportStampFromRow) is
  // responsible for forwarding the row's custom_* fields.
  const meta = type ? STAMP_META[type] : null
  const label = props.label ?? meta?.label
  const emoji = props.emoji ?? meta?.emoji
  const ink = props.ink ?? meta?.ink
  const shape = props.shape ?? (type ? SHAPE_FOR_TYPE[type] : null) ?? 'circle'
  if (!label || !emoji || !ink) return null

  // Seed for rotation + distress filter. Stable per-stamp so the same
  // stamp always looks identical across renders.
  const seedSource = type ?? `${label}|${emoji}`
  const angle = rotate ?? rotationFor(seedSource)
  const seed = hashSeed(seedSource) % 1000

  const { w, h } = pxFor(shape, size)
  const dateStr = formatDateLine(date)
  // Default issuer mark when no country is attached (eg. STEP_CHAMP,
  // EARLY_BIRD, milestones, customs). Real country names pass through.
  const countryStr = country ? country.toUpperCase() : 'JFT'
  const labelStr = label.toUpperCase()

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{
        width: w,
        height: h,
        transform: `rotate(${angle}deg)`,
        opacity: 0.88,
        mixBlendMode: 'multiply',
      }}
      aria-label={`${label}${country ? ' · ' + countryStr : ''}${dateStr ? ' · ' + dateStr : ''}`}
    >
      <StampSVG
        shape={shape}
        ink={ink}
        label={labelStr}
        country={countryStr}
        date={dateStr}
        emoji={emoji}
        seed={seed}
      />
    </div>
  )
}

function StampSVG({ shape, ink, label, country, date, emoji, seed }: {
  shape: StampShape; ink: string; label: string; country: string; date: string; emoji: string; seed: number
}) {
  if (shape === 'circle' || shape === 'oval') {
    return <CircularStamp shape={shape} ink={ink} label={label} country={country} date={date} emoji={emoji} seed={seed} />
  }
  if (shape === 'rounded' || shape === 'flag') {
    return <RectStamp shape={shape} ink={ink} label={label} country={country} date={date} emoji={emoji} seed={seed} />
  }
  return <IrregularStamp shape={shape} ink={ink} label={label} country={country} date={date} emoji={emoji} seed={seed} />
}

// Split a long label into ~even two-line halves on word boundaries.
// Used by IrregularStamp where horizontal space is tight (shield,
// hexagon). Short labels stay on a single line.
function splitLabel(label: string, maxOneLine = 11): string[] {
  if (label.length <= maxOneLine || !label.includes(' ')) return [label]
  const words = label.split(' ')
  if (words.length === 2) return words
  const mid = label.length / 2
  let bestSplit = 1
  let bestDiff = Infinity
  for (let i = 1; i < words.length; i++) {
    const leftLen = words.slice(0, i).join(' ').length
    const diff = Math.abs(leftLen - mid)
    if (diff < bestDiff) {
      bestDiff = diff
      bestSplit = i
    }
  }
  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')]
}

// Distress filter — applied to DECORATIVE elements only (rings, dot
// rings, bracketing rules). Text is rendered without this filter so
// letters stay crisp and readable.
//   - feDisplacementMap gives a tiny hand-pressed wobble.
//   - A second noise → alpha mask carves small broken-ink patches.
function DistressFilter({ id, seed }: { id: string; seed: number }) {
  return (
    <filter id={id}>
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={seed} result="wobNoise" />
      <feDisplacementMap in="SourceGraphic" in2="wobNoise" scale="0.4" result="wobbled" />
      <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="1" seed={seed + 7} result="patchNoise" />
      <feColorMatrix
        in="patchNoise"
        type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.2 -0.18"
        result="patchAlpha"
      />
      <feComposite in="wobbled" in2="patchAlpha" operator="in" />
    </filter>
  )
}

function CircularStamp({ shape, ink, label, country, date, emoji, seed }: {
  shape: 'circle' | 'oval'; ink: string; label: string; country: string; date: string; emoji: string; seed: number
}) {
  const filterId = `pst-d-${seed}`
  const topArcId = `pst-top-${seed}`
  const botArcId = `pst-bot-${seed}`
  const vbW = 200
  const vbH = shape === 'oval' ? 140 : 200
  const cx = vbW / 2
  const cy = vbH / 2
  const outerR = 92
  const innerR = outerR - 14
  const dotR = innerR + 7
  // Top arc sits just outside inner ring; text extends OUTWARD (toward
  // outer ring band) along the top half. Bottom arc sits just inside
  // outer ring; text extends INWARD at the bottom (toward inner ring
  // band) so the country name reads upright in the ring band without
  // needing the SVG2 `side="right"` attribute (which lacks React types).
  const topArcR = innerR + 1
  const botArcR = outerR - 2
  const ovalYK = 0.7   // oval squish factor
  const ry = (r: number) => shape === 'oval' ? r * ovalYK : r
  const dotCount = shape === 'oval' ? 20 : 18

  const topArc = `M ${cx - topArcR},${cy} A ${topArcR},${ry(topArcR)} 0 0 1 ${cx + topArcR},${cy}`
  const botArc = `M ${cx - botArcR},${cy} A ${botArcR},${ry(botArcR)} 0 0 0 ${cx + botArcR},${cy}`

  const dots = Array.from({ length: dotCount }, (_, i) => {
    const a = (i / dotCount) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(a) * dotR, y: cy + Math.sin(a) * ry(dotR) }
  })

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      <defs>
        <DistressFilter id={filterId} seed={seed} />
        <path id={topArcId} d={topArc} />
        <path id={botArcId} d={botArc} />
      </defs>
      {/* Decorative layer — distress filter applied here only */}
      <g filter={`url(#${filterId})`} fill="none" stroke={ink}>
        {shape === 'oval' ? (
          <>
            <ellipse cx={cx} cy={cy} rx={outerR} ry={ry(outerR)} strokeWidth="3" />
            <ellipse cx={cx} cy={cy} rx={innerR} ry={ry(innerR)} strokeWidth="1.2" />
          </>
        ) : (
          <>
            <circle cx={cx} cy={cy} r={outerR} strokeWidth="3" />
            <circle cx={cx} cy={cy} r={innerR} strokeWidth="1.2" />
          </>
        )}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="1.6" fill={ink} stroke="none" />
        ))}
        <line x1={cx - 32} y1={cy + 22} x2={cx + 32} y2={cy + 22} strokeWidth="0.6" />
        <line x1={cx - 32} y1={cy + 36} x2={cx + 32} y2={cy + 36} strokeWidth="0.6" />
      </g>
      {/* Text layer — no filter, crisp. Font size steps down on the
          top label and bottom country arc as text gets longer so it
          stays inside the ring band. */}
      <g fill={ink} stroke="none">
        <text
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize={shrinkFor(label, 14, 1.5, 9)}
          fontWeight="800"
          letterSpacing={label.length > 16 ? 1.5 : 2.5}
        >
          <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">{label}</textPath>
        </text>
        <text
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize={shrinkFor(country, 10, 1, 7)}
          fontWeight="700"
          letterSpacing={country.length > 16 ? 1.2 : 2}
        >
          <textPath href={`#${botArcId}`} startOffset="50%" textAnchor="middle">{country}</textPath>
        </text>
        {/* Emoji sits at the visual centre of the free space inside
            the inner ring, above the date strip — not the absolute
            geometric centre. Oval has less vertical room so its emoji
            sits higher and is a touch smaller. */}
        <text
          x={cx}
          y={shape === 'oval' ? cy - 16 : cy - 28}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={shape === 'oval' ? 46 : 58}
        >
          {emoji}
        </text>
        <text
          x={cx}
          y={cy + 33}
          textAnchor="middle"
          fontFamily="ui-monospace, 'SF Mono', Menlo, monospace"
          fontSize="10"
          fontWeight="700"
          letterSpacing="1.6"
        >
          {date || '· · · · ·'}
        </text>
      </g>
    </svg>
  )
}

function RectStamp({ shape, ink, label, country, date, emoji, seed }: {
  shape: 'rounded' | 'flag'; ink: string; label: string; country: string; date: string; emoji: string; seed: number
}) {
  const filterId = `pst-d-${seed}`
  const vbW = 240
  const vbH = 160
  const inset = 14
  const innerInset = 24
  const radius = shape === 'rounded' ? 18 : 6
  const innerRadius = Math.max(2, radius - 6)

  const dotCountX = 14
  const dotCountY = 8
  const dotsTop = Array.from({ length: dotCountX }, (_, i) => ({
    x: innerInset + ((vbW - innerInset * 2) / (dotCountX - 1)) * i,
    y: innerInset + 4,
  }))
  const dotsBot = Array.from({ length: dotCountX }, (_, i) => ({
    x: innerInset + ((vbW - innerInset * 2) / (dotCountX - 1)) * i,
    y: vbH - innerInset - 4,
  }))
  const dotsLeft = Array.from({ length: dotCountY }, (_, i) => ({
    x: innerInset + 4,
    y: innerInset + 8 + ((vbH - innerInset * 2 - 16) / (dotCountY - 1)) * i,
  }))
  const dotsRight = Array.from({ length: dotCountY }, (_, i) => ({
    x: vbW - innerInset - 4,
    y: innerInset + 8 + ((vbH - innerInset * 2 - 16) / (dotCountY - 1)) * i,
  }))
  const allDots = [...dotsTop, ...dotsBot, ...dotsLeft, ...dotsRight]

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      <defs>
        <DistressFilter id={filterId} seed={seed} />
      </defs>
      <g filter={`url(#${filterId})`} fill="none" stroke={ink}>
        <rect
          x={inset}
          y={inset}
          width={vbW - inset * 2}
          height={vbH - inset * 2}
          rx={radius}
          strokeWidth="3"
        />
        <rect
          x={innerInset}
          y={innerInset}
          width={vbW - innerInset * 2}
          height={vbH - innerInset * 2}
          rx={innerRadius}
          strokeWidth="1.1"
        />
        {allDots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="1.2" fill={ink} stroke="none" />
        ))}
        <line x1={vbW / 2 - 50} y1={vbH / 2 + 16} x2={vbW / 2 + 50} y2={vbH / 2 + 16} strokeWidth="0.6" />
        <line x1={vbW / 2 - 50} y1={vbH / 2 + 30} x2={vbW / 2 + 50} y2={vbH / 2 + 30} strokeWidth="0.6" />
      </g>
      <g fill={ink} stroke="none">
        <text
          x={vbW / 2}
          y={innerInset + 22}
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize={shrinkFor(label, 16, 2, 10)}
          fontWeight="800"
          letterSpacing={label.length > 16 ? 1.5 : 3}
        >
          {label}
        </text>
        {/* Emoji centred between label and date strip, sized to fill
            the free vertical space rather than the geometric middle. */}
        <text
          x={vbW / 2}
          y={72}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="48"
        >
          {emoji}
        </text>
        <text
          x={vbW / 2}
          y={vbH / 2 + 27}
          textAnchor="middle"
          fontFamily="ui-monospace, 'SF Mono', Menlo, monospace"
          fontSize="11"
          fontWeight="700"
          letterSpacing="2"
        >
          {date || '· · · · ·'}
        </text>
        <text
          x={vbW / 2}
          y={vbH - innerInset - 12}
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize={shrinkFor(country, 10, 1, 7)}
          fontWeight="700"
          letterSpacing={country.length > 16 ? 1.2 : 2}
        >
          {country}
        </text>
      </g>
    </svg>
  )
}

const IRREGULAR_PATHS: Record<string, string> = {
  shield:  'M50 4 L94 18 L94 60 Q94 75 75 86 L50 96 L25 86 Q6 75 6 60 L6 18 Z',
  star:    'M50 4 L62 38 L96 38 L68 58 L78 92 L50 72 L22 92 L32 58 L4 38 L38 38 Z',
  hexagon: 'M50 4 L92 26 L92 74 L50 96 L8 74 L8 26 Z',
}

// ── Helpers for rendering stored stamp rows ──────────────────────
//
// Stored stamp rows may be one of the 17 system types (label/emoji/
// ink come from STAMP_META) or 'CUSTOM' (label/emoji/ink/shape come
// from the row's custom_* columns). Use these helpers anywhere a
// stamp is rendered straight from the DB so the dispatch lives in
// one place.

type StampRowLike = {
  type: StampType
  custom_label: string | null
  custom_emoji: string | null
  custom_shape: string | null
  custom_ink: string | null
}

export function effectiveStampMeta(row: StampRowLike): { label: string; emoji: string; ink: string } {
  if (row.type === 'CUSTOM') {
    return {
      label: row.custom_label ?? '—',
      emoji: row.custom_emoji ?? '✨',
      ink:   row.custom_ink   ?? '#0f3a2a',
    }
  }
  const meta = STAMP_META[row.type]
  return { label: meta.label, emoji: meta.emoji, ink: meta.ink }
}

export function PassportStampFromRow({
  row, country, date, size, rotate,
}: {
  row: StampRowLike
  country?: string | null
  date?: string | null
  size?: 'sm' | 'md'
  rotate?: number
}) {
  if (row.type === 'CUSTOM') {
    return (
      <PassportStamp
        label={row.custom_label ?? '—'}
        emoji={row.custom_emoji ?? '✨'}
        ink={row.custom_ink ?? '#0f3a2a'}
        shape={(row.custom_shape as StampShape) ?? 'circle'}
        country={country}
        date={date}
        size={size}
        rotate={rotate}
      />
    )
  }
  return <PassportStamp type={row.type} country={country} date={date} size={size} rotate={rotate} />
}

function IrregularStamp({ shape, ink, label, country, date, emoji, seed }: {
  shape: StampShape; ink: string; label: string; country: string; date: string; emoji: string; seed: number
}) {
  const filterId = `pst-d-${seed}`
  const d = IRREGULAR_PATHS[shape] ?? IRREGULAR_PATHS.shield
  const lines = splitLabel(label)
  // Two-line labels push the rest of the layout down a touch so
  // nothing collides with the second line.
  const labelY1 = lines.length === 2 ? 20 : 24
  const labelY2 = 28
  // Emoji sits in the middle of the free space between the bottom of
  // the label and the top of the date strip — moves down a little
  // when the label is single-line because there's more room above.
  const emojiY  = lines.length === 2 ? 44 : 42
  const dateY1  = 56
  const dateY2  = 66
  const countryY = 78
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      <defs>
        <DistressFilter id={filterId} seed={seed} />
      </defs>
      <g filter={`url(#${filterId})`} fill="none" stroke={ink}>
        <path d={d} strokeWidth="1.8" strokeLinejoin="round" />
        <line x1="22" y1={dateY1} x2="78" y2={dateY1} strokeWidth="0.4" />
        <line x1="22" y1={dateY2} x2="78" y2={dateY2} strokeWidth="0.4" />
      </g>
      <g fill={ink} stroke="none">
        <text
          x="50"
          y={labelY1}
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="7"
          fontWeight="800"
          letterSpacing="0.8"
        >
          {lines[0]}
        </text>
        {lines[1] && (
          <text
            x="50"
            y={labelY2}
            textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="7"
            fontWeight="800"
            letterSpacing="0.8"
          >
            {lines[1]}
          </text>
        )}
        <text
          x="50"
          y={emojiY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="24"
        >
          {emoji}
        </text>
        <text
          x="50"
          y={dateY2 - 3}
          textAnchor="middle"
          fontFamily="ui-monospace, 'SF Mono', Menlo, monospace"
          fontSize="6.5"
          fontWeight="700"
          letterSpacing="1"
        >
          {date || '· · · ·'}
        </text>
        <text
          x="50"
          y={countryY}
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="6"
          fontWeight="700"
          letterSpacing="1.2"
        >
          {country}
        </text>
      </g>
    </svg>
  )
}
