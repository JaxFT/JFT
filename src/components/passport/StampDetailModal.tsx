'use client'

// Modal that pops up when a kid taps a stamp in their passport.
// Shows the stamp graphic, its name, a short description ("you got
// this for..."), the date earned, and the parent's note if there
// is one (custom stamps usually have one, system stamps may).

import { useEffect } from 'react'
import { X } from 'lucide-react'

type Props = {
  title: string
  description: string
  date: string | null
  country: string | null
  note: string | null
  // Rendered stamp graphic (PassportStamp or MilestoneStamp). The
  // caller passes whichever one represents this stamp so the modal
  // shows the same visual the kid just tapped.
  graphic: React.ReactNode
  onClose: () => void
}

export default function StampDetailModal({
  title, description, date, country, note, graphic, onClose,
}: Props) {
  // Esc closes the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const formattedDate = date ? formatDate(date) : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-3xl px-6 py-7 shadow-2xl text-center"
        style={{ color: '#3a2810' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-amber-900/40 hover:text-amber-900 p-1.5"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-center mb-4">
          {graphic}
        </div>

        <p
          className="text-lg font-extrabold uppercase tracking-widest leading-tight mb-1"
          style={{ color: '#5a3a12' }}
        >
          {title}
        </p>

        {country && (
          <p className="text-xs uppercase tracking-widest opacity-70 mb-3" style={{ color: '#5a3a12' }}>
            {country}
          </p>
        )}

        <p className="text-sm leading-relaxed max-w-xs mx-auto mt-2" style={{ color: '#5a3a12' }}>
          {description}
        </p>

        {note && (
          <p
            className="text-sm leading-relaxed mt-4 italic"
            style={{ color: '#5a3a12' }}
          >
            &ldquo;{note}&rdquo;
          </p>
        )}

        {formattedDate && (
          <p className="text-[11px] uppercase tracking-widest opacity-50 mt-5" style={{ color: '#5a3a12' }}>
            Earned {formattedDate}
          </p>
        )}
      </div>
    </div>
  )
}

function formatDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
