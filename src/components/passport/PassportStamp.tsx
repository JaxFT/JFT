// A passport-stamp graphic: ink-circle aesthetic with a double border,
// faded colour that varies by stamp type, the stamp emoji at the
// centre, the stamp label curved underneath, and the country (if any)
// + date stamped below. Slightly rotated for that hand-pressed look.
//
// Used on the kid's Stamps tab, the country passport page, and the
// passport-overview "recent stamps" strip.

import { STAMP_META, type StampType } from '@/lib/passport-types'

type Props = {
  type: StampType
  // Country slug (for country-scoped stamps). Rendered as a short label
  // along the bottom of the stamp — e.g. "JAPAN".
  country?: string | null
  // ISO date string (YYYY-MM-DD or a full ISO timestamp). Rendered as
  // a "26 MAY 2026"-style date along the bottom edge.
  date?: string | null
  // Optional rotation in degrees. If not supplied a deterministic
  // pseudo-rotation is derived from the stamp type so the same stamp
  // always sits at the same angle for a given child (no jitter on
  // re-render).
  rotate?: number
  // Layout size. 'sm' for inline contexts (e.g. recent-stamps strip),
  // 'md' for the main stamps grid.
  size?: 'sm' | 'md'
}

function rotationFor(type: StampType): number {
  // Hash the stamp type name into a small range of degrees so the
  // angle feels organic but is stable across renders.
  let h = 0
  for (let i = 0; i < type.length; i++) h = (h * 31 + type.charCodeAt(i)) >>> 0
  return ((h % 13) - 6) // -6deg .. +6deg
}

function formatStampDate(s?: string | null): string | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

export default function PassportStamp({
  type,
  country,
  date,
  rotate,
  size = 'md',
}: Props) {
  const meta = STAMP_META[type]
  const angle = rotate ?? rotationFor(type)
  const dim = size === 'md' ? 132 : 92
  const innerDim = size === 'md' ? 116 : 80
  const emojiSize = size === 'md' ? 'text-4xl' : 'text-2xl'
  const labelSize = size === 'md' ? 'text-[10px]' : 'text-[8px]'
  const captionSize = size === 'md' ? 'text-[9px]' : 'text-[7px]'

  return (
    <div
      className="inline-flex items-center justify-center select-none"
      style={{
        width: dim,
        height: dim,
        transform: `rotate(${angle}deg)`,
        // Slight ink-feathering effect: very small blur + reduced opacity
        // makes the colour read like real ink on absorbent paper.
        filter: 'contrast(0.92)',
      }}
    >
      <div
        className="relative flex flex-col items-center justify-center rounded-full"
        style={{
          width: innerDim,
          height: innerDim,
          color: meta.ink,
          // Double border: outer thin ring + inner solid ring,
          // separated by 4px of "paper". This is the classic
          // border-double effect but at a thickness that reads on
          // mobile.
          border: `2.5px double ${meta.ink}`,
          boxShadow: `inset 0 0 0 1.5px transparent`,
          // Faint paper sheen so the stamp doesn't sit flat.
          backgroundColor: 'rgba(255,255,255,0.04)',
          opacity: 0.92,
        }}
      >
        <span className={`${emojiSize} leading-none mb-0.5`} aria-hidden>{meta.emoji}</span>
        <span
          className={`${labelSize} font-extrabold uppercase tracking-[0.18em] text-center px-1 leading-tight`}
          style={{ color: meta.ink }}
        >
          {meta.label}
        </span>
        {(country || date) && (
          <span
            className={`${captionSize} uppercase tracking-[0.12em] text-center px-1 mt-0.5 leading-tight`}
            style={{ color: meta.ink, opacity: 0.8 }}
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
