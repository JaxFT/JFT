// Passport-stamp graphic for the 17 system stamp types. Each type
// gets a deterministic shape so the Stamps tab feels like a real
// passport — circles, ovals, rounded rects, shields and stars all
// jostling on the page rather than a uniform grid.
//
// Distressed look: slight contrast + opacity reduction makes the
// stamp read like ink soaked into paper instead of a perfect badge.

import { STAMP_META, type StampType } from '@/lib/passport-types'
import type { StampShape } from '@/lib/passport-milestones'

type Props = {
  type: StampType
  country?: string | null
  date?: string | null
  rotate?: number
  size?: 'sm' | 'md'
}

// Which stamp types get which shapes. Mixed deliberately so a page of
// stamps reads like a varied passport, not a grid.
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

function dimsFor(shape: StampShape, size: 'sm' | 'md') {
  const base = size === 'md' ? 116 : 80
  if (shape === 'oval')    return { w: base * 1.35, h: base * 0.85 }
  if (shape === 'rounded') return { w: base * 1.2,  h: base * 0.9 }
  if (shape === 'flag')    return { w: base * 1.15, h: base * 1.05 }
  if (shape === 'shield')  return { w: base,        h: base * 1.1 }
  if (shape === 'star')    return { w: base * 1.05, h: base * 1.05 }
  return { w: base, h: base }
}

function clipFor(shape: StampShape): string | undefined {
  switch (shape) {
    case 'shield': return 'polygon(50% 0%, 100% 18%, 100% 70%, 50% 100%, 0% 70%, 0% 18%)'
    case 'star':   return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
    default:       return undefined
  }
}

function borderRadiusFor(shape: StampShape): string {
  switch (shape) {
    case 'circle':  return '50%'
    case 'oval':    return '50% / 50%'
    case 'rounded': return '14px'
    case 'flag':    return '4px'
    default:        return '0'
  }
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
  const containerDim = Math.max(w, h) + 16
  const emojiSize = size === 'md' ? 'text-3xl' : 'text-xl'
  const labelSize = size === 'md' ? 'text-[10px]' : 'text-[8px]'
  const captionSize = size === 'md' ? 'text-[9px]' : 'text-[7px]'

  const clipPath = clipFor(shape)
  const radius = borderRadiusFor(shape)

  return (
    <div
      className="inline-flex items-center justify-center select-none"
      style={{
        width: containerDim,
        height: containerDim,
        transform: `rotate(${angle}deg)`,
        filter: 'contrast(0.9)',
        opacity: 0.94,
      }}
    >
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          width: w,
          height: h,
          color: meta.ink,
          ...(clipPath
            ? { clipPath, background: meta.ink, padding: 3 }
            : {
                border: `2.5px double ${meta.ink}`,
                borderRadius: radius,
                backgroundColor: 'rgba(255,255,255,0.04)',
              }),
        }}
      >
        <div
          className="flex flex-col items-center justify-center w-full h-full"
          style={
            clipPath
              ? { background: '#fdf8ed', clipPath, margin: 0 }
              : undefined
          }
        >
          <span className={`${emojiSize} leading-none mb-0.5`} aria-hidden>{meta.emoji}</span>
          <span
            className={`${labelSize} font-extrabold uppercase tracking-[0.14em] text-center px-2 leading-tight`}
            style={{ color: meta.ink }}
          >
            {meta.label}
          </span>
          {(country || date) && (
            <span
              className={`${captionSize} uppercase tracking-[0.10em] text-center px-2 mt-0.5 leading-tight`}
              style={{ color: meta.ink, opacity: 0.7 }}
            >
              {country?.toUpperCase()}
              {country && date ? ' · ' : ''}
              {formatStampDate(date)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
