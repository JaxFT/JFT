'use client'

// Pops a small celebration when a kid opens their passport and
// there are stamps newer than the last time they were here. Uses
// localStorage to track the "last seen" timestamp per-token, so
// each kid's device remembers what they've already seen. New
// stamps awarded by the parent show up the next time the kid
// opens their book.
//
// Heuristic, not source of truth: if the kid uses a different
// device or clears local storage, every stamp shows as "new" on
// first open. Acceptable, the worst case is over-celebrating.

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { PassportStampFromRow } from './PassportStamp'
import { STAMP_META, type StampType, type StampStatus } from '@/lib/passport-types'
import { getPackMeta } from '@/lib/adventurePackMeta'

type StampLike = {
  id: string
  type: StampType
  country_slug: string | null
  status: StampStatus
  earned_at: string
  custom_label: string | null
  custom_emoji: string | null
  custom_shape: string | null
  custom_ink: string | null
}

const LS_KEY = (token: string) => `jft.passport.lastSeenStamp.${token}`

export default function NewStampsAnnouncement({
  token,
  stamps,
}: {
  token: string
  stamps: StampLike[]
}) {
  const [open, setOpen] = useState(false)
  const [newOnes, setNewOnes] = useState<StampLike[]>([])

  // The latest earned_at across the current stamps list, used to
  // bump the "last seen" pointer when the kid dismisses the popup.
  const latestEarnedAt = useMemo(() => {
    if (stamps.length === 0) return null
    return stamps.reduce((max, s) => (s.earned_at > max ? s.earned_at : max), stamps[0].earned_at)
  }, [stamps])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let lastSeen: string | null = null
    try {
      lastSeen = window.localStorage.getItem(LS_KEY(token))
    } catch { /* private window: skip */ }

    // First visit ever → don't dump a wall of celebrations for the
    // whole history. Just record the latest and move on.
    if (!lastSeen) {
      if (latestEarnedAt) {
        try { window.localStorage.setItem(LS_KEY(token), latestEarnedAt) } catch { /* noop */ }
      }
      return
    }

    const fresh = stamps
      .filter(s => s.status === 'awarded' && s.earned_at > lastSeen!)
      .sort((a, b) => (a.earned_at < b.earned_at ? 1 : -1))
    if (fresh.length > 0) {
      setNewOnes(fresh)
      setOpen(true)
    }
  }, [token, stamps, latestEarnedAt])

  const dismiss = () => {
    setOpen(false)
    if (typeof window === 'undefined') return
    if (latestEarnedAt) {
      try { window.localStorage.setItem(LS_KEY(token), latestEarnedAt) } catch { /* noop */ }
    }
  }

  if (!open || newOnes.length === 0) return null

  const headline = newOnes.length === 1
    ? '1 new stamp since you were here'
    : `${newOnes.length} new stamps since you were here`

  return (
    <div
      role="dialog"
      aria-live="polite"
      onClick={dismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] px-4 cursor-pointer"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative max-w-md w-full bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-3xl px-7 py-7 shadow-2xl text-center animate-stamp-burst"
        style={{ color: '#3a2810' }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-2 right-2 text-amber-900/40 hover:text-amber-900 p-1.5"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <p
          className="text-[11px] uppercase tracking-[0.25em] font-extrabold inline-flex items-center gap-1.5 mb-4"
          style={{ color: '#a37a32' }}
        >
          <Sparkles className="w-3.5 h-3.5" /> {headline} <Sparkles className="w-3.5 h-3.5" />
        </p>

        {/* Stamps row, scrollable horizontally if many */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-5 max-h-[40dvh] overflow-y-auto px-1">
          {newOnes.slice(0, 8).map(s => {
            const country = s.country_slug ? getPackMeta(s.country_slug)?.country ?? null : null
            return (
              <PassportStampFromRow
                key={s.id}
                row={s}
                country={country}
                date={s.earned_at}
                size="sm"
              />
            )
          })}
        </div>
        {newOnes.length > 8 && (
          <p className="text-xs opacity-60 mb-4" style={{ color: '#5a3a12' }}>
            +{newOnes.length - 8} more in your book.
          </p>
        )}

        <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: '#5a3a12' }}>
          {newOnes.length === 1
            ? `${labelOf(newOnes[0])} just landed in your passport.`
            : 'Tap a stamp in your book to see what each one is for.'}
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-900 bg-amber-200/60 hover:bg-amber-200 px-4 py-2 rounded-full"
        >
          Open my passport
        </button>
      </div>
    </div>
  )
}

function labelOf(s: StampLike): string {
  if (s.type === 'CUSTOM') return s.custom_label ?? 'A new custom stamp'
  return STAMP_META[s.type].label
}
