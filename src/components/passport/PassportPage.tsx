import type { ReactNode } from 'react'

// A cream-paper wrapper that everything passport-y sits on.
//
// `book` mode:
//   - Fixed height (~88dvh on phones, more on tablets) so pages stay
//     the same size across the tab
//   - Internal vertical scroll on the content area
//   - Optional `footer` prop pins to the bottom of the page (used for
//     the prev/next pagination bar on Stamps and Journal)
//   - Dark stitched spine down the left edge for the bound-book feel

export default function PassportPage({
  children,
  footer,
  className = '',
  book = false,
}: {
  children: ReactNode
  // Pinned to the bottom of the page in book mode. Not part of the
  // scrollable content.
  footer?: ReactNode
  className?: string
  book?: boolean
}) {
  return (
    <div
      className={`relative rounded-2xl border border-amber-100 shadow-md ${
        book ? 'h-[88dvh] min-h-[460px]' : ''
      } ${className}`}
      style={{
        background:
          'radial-gradient(ellipse at center, #fdf8ed 0%, #f5ead0 100%), linear-gradient(180deg, #fdf8ed, #f0e3c2)',
        backgroundBlendMode: 'multiply',
        overflow: 'hidden',
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

      {/* Book spine on the left edge */}
      {book && (
        <>
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-6 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(50,30,10,0.30) 0%, rgba(80,40,10,0.15) 60%, transparent 100%)',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-y-3 left-2 w-px pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,235,180,0.5) 0, rgba(255,235,180,0.5) 6px, transparent 6px, transparent 14px)',
            }}
          />
        </>
      )}

      {/* Page-curl shadow on the right edge */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-8 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(80,40,10,0.10) 90%, rgba(80,40,10,0.18) 100%)',
        }}
      />

      {/* Globe watermark */}
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

      {/* Content layout. Book mode = flex column with scrollable
          middle and pinned footer. Non-book = static block. */}
      {book ? (
        <div className="relative h-full flex flex-col pl-6">
          <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
          {footer && (
            <div
              className="shrink-0 px-1 py-3 mt-auto"
              style={{ borderTop: '1px dashed rgba(120,80,30,0.3)' }}
            >
              {footer}
            </div>
          )}
        </div>
      ) : (
        <div className="relative">{children}</div>
      )}
    </div>
  )
}
