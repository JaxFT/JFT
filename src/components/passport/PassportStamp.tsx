// Passport-stamp graphic for the 17 system stamp types.
//
// Outline is a clean SVG stroke (no wobble) — the "old stamp" feel
// comes from faded ink, not jittery lines. Mix-blend-mode multiply
// makes the colour soak into whatever paper is behind it.
//
// Text is laid out inside the stamp's bounding box and wraps if
// needed. For regular shapes (circle/oval/rounded/flag) it always
// fits inside. For star / shield / continent silhouettes the text
// may extend past the visible outline because the shape's concave
// parts leave the bounding box unfilled — which is exactly how real
// stamps over-press onto a passport page.

import { STAMP_META, type StampType } from '@/lib/passport-types'
import StampOutline from './StampOutline'
import type { StampShape } from '@/lib/passport-milestones'

type Props = {
  type: StampType
  country?: string | null
  date?: string | null
  rotate?: number
  size?: 'sm' | 'md'
}

const SHAPE_FOR_TYPE: Record<StampType, StampShape> = {
  BRAVE_EATER:             'circle',
  LOCAL_LINGO:             'oval',
  STEP_CHAMP:              'rounded',
  ADVENTURE_PACK_COMPLETE: 'star',
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
}

function rotationFor(type: StampType): number {
  let h = 0
  for (let i = 0; i < type.length; i++) h = (h * 31 + type.charCodeAt(i)) >>> 0
  return ((h % 13) - 6)
}

function formatStampDate(s?: string | null): string | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

// Different shapes look balanced at different W/H ratios.
function dimsFor(shape: StampShape, size: 'sm' | 'md') {
  const base = size === 'md' ? 124 : 88
  if (shape === 'oval')    return { w: base * 1.35, h: base * 0.85 }
  if (shape === 'rounded') return { w: base * 1.2,  h: base * 0.9 }
  if (shape === 'flag')    return { w: base * 1.1,  h: base }
  if (shape === 'shield')  return { w: base * 0.95, h: base * 1.05 }
  if (shape === 'star')    return { w: base * 1.05, h: base * 1.05 }
  if (shape === 'hexagon') return { w: base * 1.1,  h: base * 0.95 }
  return { w: base, h: base }
}

export default function PassportStamp({
  type,
  country,
  date,
  rotate,
  size = 'md',
}: Props) {
  const meta = STAMP_META[type]
  const shape = SHAPE_FOR_TYPE[type] ?? 'circle'
  const angle = rotate ?? rotationFor(type)
  const { w, h } = dimsFor(shape, size)
  const emojiSize = size === 'md' ? 'text-3xl' : 'text-xl'
  const labelSize = size === 'md' ? 'text-[10px]' : 'text-[8px]'
  const captionSize = size === 'md' ? 'text-[8.5px]' : 'text-[7px]'

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{
        width: w,
        height: h,
        transform: `rotate(${angle}deg)`,
        // Faded ink: lower opacity + multiply makes the stamp colour
        // soak into the cream paper underneath rather than sit on top.
        opacity: 0.78,
        mixBlendMode: 'multiply',
      }}
    >
      {/* SVG outline (clean, crisp) sits behind the content */}
      <StampOutline shape={shape} ink={meta.ink} w={w} h={h} />

      {/* Content layer — sits inside the stamp's bounding box. Text
          wraps if it doesn't fit. For irregular shapes (star, shield,
          continents) it may visually extend past the outline at the
          shape's concave edges — that's the desired effect. */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-3"
        style={{
          color: meta.ink,
          width: '100%',
          maxWidth: w - 14,
        }}
      >
        <span className={`${emojiSize} leading-none mb-0.5`} aria-hidden>{meta.emoji}</span>
        <span
          className={`${labelSize} font-extrabold uppercase tracking-[0.1em] leading-tight`}
          style={{ color: meta.ink }}
        >
          {meta.label}
        </span>
        {(country || date) && (
          <span
            className={`${captionSize} uppercase tracking-[0.06em] leading-tight mt-0.5`}
            style={{ color: meta.ink, opacity: 0.78 }}
          >
            {country?.toUpperCase()}
            {country && date ? ' · ' : ''}
            {formatStampDate(date)}
          </span>
        )}
      </div>
    </div>
  )
}
