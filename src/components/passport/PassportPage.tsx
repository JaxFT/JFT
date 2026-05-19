import type { ReactNode } from 'react'

// A cream-paper wrapper that everything passport-y sits on — kid Stamps
// tab, country pages, etc. Built with pure CSS so no asset to ship:
//
//  - radial cream vignette so the centre reads lighter than the edges
//  - faint horizontal ruled lines for "page" texture
//  - a soft warm spotlight from the top-left
//  - a subtle page-curl shadow at the right edge (book feel)
//  - an almost-invisible globe watermark sitting in the middle

export default function PassportPage({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-amber-100 shadow-md ${className}`}
      style={{
        background:
          'radial-gradient(ellipse at center, #fdf8ed 0%, #f5ead0 100%), linear-gradient(180deg, #fdf8ed, #f0e3c2)',
        backgroundBlendMode: 'multiply',
      }}
    >
      {/* Faint horizontal ruled lines */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(120,80,30,0.04) 0, rgba(120,80,30,0.04) 1px, transparent 1px, transparent 24px)',
        }}
      />

      {/* Warm spotlight from top-left */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 0%, rgba(255,240,200,0.5) 0%, transparent 50%)',
        }}
      />

      {/* Soft page-curl shadow on the right edge so pages feel
          three-dimensional / like a stack of book pages */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-8 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(80,40,10,0.10) 90%, rgba(80,40,10,0.18) 100%)',
        }}
      />

      {/* Faint globe watermark in the centre — sits well behind text */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ opacity: 0.05 }}
      >
        <svg viewBox="0 0 200 200" className="w-2/3 max-w-[400px]" fill="none" stroke="#5a3a12" strokeWidth="1">
          <circle cx="100" cy="100" r="90" />
          <ellipse cx="100" cy="100" rx="90" ry="36" />
          <ellipse cx="100" cy="100" rx="90" ry="72" />
          <line x1="10" y1="100" x2="190" y2="100" />
          <line x1="100" y1="10" x2="100" y2="190" />
          <line x1="40" y1="40" x2="160" y2="160" />
          <line x1="160" y1="40" x2="40" y2="160" />
        </svg>
      </div>

      <div className="relative">{children}</div>
    </div>
  )
}
