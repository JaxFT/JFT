// Passport-stamp graphic for a derived milestone. Same family as
// <PassportStamp/> but takes its own props and supports a wider set
// of shapes. Defaults to a distressed, slightly-translucent ink look
// so a wall of these reads like a real passport book, not a tidy
// grid of identical circles.

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

// Pick a shape-specific dimension ratio. We pass width and height
// separately so e.g. ovals stretch horizontally.
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
    case 'shield':
      return 'polygon(50% 0%, 100% 18%, 100% 70%, 50% 100%, 0% 70%, 0% 18%)'
    case 'star':
      return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
    default:
      return undefined
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
        // Distressed: subtle contrast + slight transparency so the
        // ink reads like it soaked into paper.
        filter: 'contrast(0.9)',
        opacity: 0.94,
      }}
    >
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          width: w,
          height: h,
          color: ink,
          // For clip-path shapes, use border via inner shadow trick.
          // For plain border-radius shapes use a real double border.
          ...(clipPath
            ? {
                clipPath,
                background: ink,
                padding: 3,
              }
            : {
                border: `2.5px double ${ink}`,
                borderRadius: radius,
                backgroundColor: 'rgba(255,255,255,0.04)',
              }),
        }}
      >
        <div
          className="flex flex-col items-center justify-center w-full h-full"
          style={
            clipPath
              ? {
                  background: '#fdf8ed',
                  clipPath,
                  // Squeeze in slightly so the outer "ring" reads
                  // through the clipped padding.
                  margin: 0,
                }
              : undefined
          }
        >
          <span className={`${emojiSize} leading-none mb-0.5`} aria-hidden>{emoji}</span>
          <span
            className={`${labelSize} font-extrabold uppercase tracking-[0.12em] text-center px-2 leading-tight`}
            style={{ color: ink }}
          >
            {label}
          </span>
          {date && (
            <span
              className={`${captionSize} uppercase tracking-[0.12em] text-center px-2 mt-0.5 leading-tight`}
              style={{ color: ink, opacity: 0.7 }}
            >
              {formatStampDate(date)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
