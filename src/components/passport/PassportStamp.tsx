// Passport-stamp graphic for the 17 system stamp types.
//
// Rendering strategy: the shape is a stroked SVG outline (no fill,
// no inner background) rendered absolutely behind the content. The
// label + emoji + date sit on top in normal flow and are free to
// overflow the shape edges — important for stars and shields where
// the wider text doesn't fit inside the geometric outline.
//
// Heavy distress: lower opacity, lower contrast, ink-bleed text
// shadow, SVG turbulence on the outline. Looks like real ink on a
// passport page rather than a clean digital badge.

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
  const base = size === 'md' ? 116 : 80
  if (shape === 'oval')       return { w: base * 1.4,  h: base * 0.85 }
  if (shape === 'rounded')    return { w: base * 1.25, h: base * 0.9 }
  if (shape === 'flag')       return { w: base * 1.15, h: base * 1.05 }
  if (shape === 'shield')     return { w: base * 0.95, h: base * 1.05 }
  if (shape === 'star')       return { w: base * 1.05, h: base * 1.05 }
  if (shape === 'africa')     return { w: base * 0.85, h: base * 1.1 }
  if (shape === 'europe')     return { w: base * 1.1,  h: base * 0.9 }
  if (shape === 'asia')       return { w: base * 1.15, h: base * 0.95 }
  if (shape === 'americas')   return { w: base * 0.75, h: base * 1.2 }
  if (shape === 'oceania')    return { w: base * 1.05, h: base * 0.8 }
  if (shape === 'antarctica') return { w: base * 1.2,  h: base * 0.55 }
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
  const containerDim = Math.max(w, h) + 18
  const emojiSize = size === 'md' ? 'text-3xl' : 'text-xl'
  const labelSize = size === 'md' ? 'text-[10px]' : 'text-[8px]'
  const captionSize = size === 'md' ? 'text-[9px]' : 'text-[7px]'

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{
        width: containerDim,
        height: containerDim,
        transform: `rotate(${angle}deg)`,
        // Real distressed look: aggressive opacity reduction + lower
        // contrast so it reads as faded ink, not a vibrant badge.
        opacity: 0.72,
        filter: 'contrast(0.88) saturate(0.9)',
      }}
    >
      {/* SVG outline sits behind the text */}
      <div
        className="absolute pointer-events-none"
        style={{ width: w, height: h, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <StampOutline shape={shape} ink={meta.ink} w={w} h={h} />
      </div>

      {/* Content layer — free to overflow the outline */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center"
        style={{
          color: meta.ink,
          // Ink-bleed: tiny same-colour shadow doubles the strokes,
          // reading as ink soaked into paper.
          textShadow: '0 0 0.5px currentColor, 0 0 1.2px currentColor',
        }}
      >
        <span className={`${emojiSize} leading-none mb-0.5`} aria-hidden>{meta.emoji}</span>
        <span
          className={`${labelSize} font-extrabold uppercase tracking-[0.14em] leading-tight whitespace-nowrap px-1`}
          style={{ color: meta.ink }}
        >
          {meta.label}
        </span>
        {(country || date) && (
          <span
            className={`${captionSize} uppercase tracking-[0.10em] leading-tight mt-0.5 whitespace-nowrap px-1`}
            style={{ color: meta.ink, opacity: 0.75 }}
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
