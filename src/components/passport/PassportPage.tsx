import type { ReactNode } from 'react'

// A cream-paper wrapper that everything passport-y sits on — kid
// Stamps tab, country pages, journal pages, etc.
//
// `book` mode pins the page to a fixed height with internal scroll,
// adds a dark vertical "spine" on the left edge, and stops content
// expanding into an infinite scroll — pages stay the same size and
// the kid scrolls within each page like flicking through a book.

export default function PassportPage({
  children,
  className = '',
  book = false,
}: {
  children: ReactNode
  className?: string
  // When true: fixed height, internal scroll, left-side spine.
  book?: boolean
}) {
  return (
    <div
      className={`relative rounded-2xl border border-amber-100 shadow-md ${book ? 'h-[70vh] min-h-[420px]' : ''} ${className}`}
      style={{
        background:
          'radial-gradient(ellipse at center, #fdf8ed 0%, #f5ead0 100%), linear-gradient(180deg, #fdf8ed, #f0e3c2)',
        backgroundBlendMode: 'multiply',
        // Hide overflow on the outer container so the spine and curl
        // stay clipped to the page edge.
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

      {/* Book spine on the left edge — a dark stitched binding shadow
          gives the page a "part of a bound book" feel. */}
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
          {/* Stitching dashes along the spine */}
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

      {/* Inner scroll container in book mode, fully indented past the
          spine on the left so content doesn't sit under it. */}
      <div
        className={book ? 'relative h-full overflow-y-auto pl-6' : 'relative'}
      >
        {children}
      </div>
    </div>
  )
}
