// Passport-stamp graphic for a derived "milestone" (e.g. 5 countries
// visited, Asia explorer). Same visual language as <PassportStamp/>
// but takes its own props so we don't have to register every
// possible milestone in STAMP_META.

type Props = {
  emoji: string
  label: string
  ink: string
  date?: string | null
  size?: 'sm' | 'md'
  rotate?: number
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

export default function MilestoneStamp({
  emoji,
  label,
  ink,
  date,
  size = 'md',
  rotate,
}: Props) {
  const angle = rotate ?? rotationFor(label)
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
        filter: 'contrast(0.92)',
      }}
    >
      <div
        className="relative flex flex-col items-center justify-center rounded-full"
        style={{
          width: innerDim,
          height: innerDim,
          color: ink,
          border: `2.5px double ${ink}`,
          backgroundColor: 'rgba(255,255,255,0.04)',
          opacity: 0.92,
        }}
      >
        <span className={`${emojiSize} leading-none mb-0.5`} aria-hidden>{emoji}</span>
        <span
          className={`${labelSize} font-extrabold uppercase tracking-[0.14em] text-center px-1 leading-tight`}
          style={{ color: ink }}
        >
          {label}
        </span>
        {date && (
          <span
            className={`${captionSize} uppercase tracking-[0.12em] text-center px-1 mt-0.5 leading-tight`}
            style={{ color: ink, opacity: 0.75 }}
          >
            {formatStampDate(date)}
          </span>
        )}
      </div>
    </div>
  )
}
