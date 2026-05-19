import type { ReactNode } from 'react'

// A cream-paper wrapper that everything passport-y sits on — kid Stamps
// tab, country pages, etc. The colour and texture come from inline
// styles (gradient + repeating linear-gradient for faint paper lines)
// so we don't have to add a CSS file or a background image asset.

export default function PassportPage({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-inner border border-amber-100 ${className}`}
      style={{
        // Base cream colour with a subtle vignette so the centre reads
        // lighter than the edges, like a paper page lit from above.
        background:
          'radial-gradient(ellipse at center, #fdf8ed 0%, #f5ead0 100%), linear-gradient(180deg, #fdf8ed, #f0e3c2)',
        backgroundBlendMode: 'multiply',
      }}
    >
      {/* Repeating very faint horizontal lines, like ruled paper but
          much fainter. Pure CSS, no asset needed. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(120,80,30,0.04) 0, rgba(120,80,30,0.04) 1px, transparent 1px, transparent 24px)',
        }}
      />
      {/* Subtle warm spotlight from top-left so the page feels like
          it's being looked at, not just floating. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 0%, rgba(255,240,200,0.5) 0%, transparent 50%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
