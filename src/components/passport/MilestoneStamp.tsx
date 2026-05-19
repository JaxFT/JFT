// Passport-stamp graphic for a derived milestone. Same rendering
// strategy as <PassportStamp/>: stroked SVG outline behind the
// content, content free to overflow the shape edges. No fill, no
// inner background — text reads "stamped over" the outline.

import StampOutline from './StampOutline'
import type { StampShape } from '@/lib/passport-milestones'

type Props = {
  emoji: string
  label: string
  ink: string
  date?: string | null
  size?: 'sm' | 'md'
  rotate?: number
  shape?: StampShape
}

function formatStampDate(s?: string | null): string | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

function rotationFor(label: string): number {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0
  return ((h % 13) - 6)
}

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

export default function MilestoneStamp({
  emoji,
  label,
  ink,
  date,
  size = 'md',
  rotate,
  shape = 'circle',
}: Props) {
  const angle = rotate ?? rotationFor(label)
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
        opacity: 0.72,
        filter: 'contrast(0.88) saturate(0.9)',
      }}
    >
      <div
        className="absolute pointer-events-none"
        style={{ width: w, height: h, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <StampOutline shape={shape} ink={ink} w={w} h={h} />
      </div>

      <div
        className="relative z-10 flex flex-col items-center justify-center text-center"
        style={{
          color: ink,
          textShadow: '0 0 0.5px currentColor, 0 0 1.2px currentColor',
        }}
      >
        <span className={`${emojiSize} leading-none mb-0.5`} aria-hidden>{emoji}</span>
        <span
          className={`${labelSize} font-extrabold uppercase tracking-[0.12em] leading-tight whitespace-nowrap px-1`}
          style={{ color: ink }}
        >
          {label}
        </span>
        {date && (
          <span
            className={`${captionSize} uppercase tracking-[0.10em] leading-tight mt-0.5 whitespace-nowrap px-1`}
            style={{ color: ink, opacity: 0.7 }}
          >
            {formatStampDate(date)}
          </span>
        )}
      </div>
    </div>
  )
}
