'use client'

// Brief celebration shown when a kid earns a stamp during a pack
// session. Displays the freshly-pressed stamp graphic, the stamp
// name, and a "🎉 New stamp!" caption. Auto-dismisses after 2.6s
// or tap-to-dismiss. Plays a short pop+wiggle animation defined in
// globals.css so it feels like the stamp got slammed onto the page.

import { useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import PassportStamp from './PassportStamp'
import { STAMP_META, type StampType } from '@/lib/passport-types'
import { getPackMeta } from '@/lib/adventurePackMeta'

type Props = {
  // The stamp just earned. When null, the component renders nothing.
  stamp: { type: StampType; country_slug: string } | null
  onDismiss: () => void
}

export default function StampCelebration({ stamp, onDismiss }: Props) {
  // Auto-dismiss after a short window so a kid can quickly move on if
  // they're in flow. They can also tap anywhere to dismiss.
  useEffect(() => {
    if (!stamp) return
    const t = setTimeout(onDismiss, 2600)
    return () => clearTimeout(t)
  }, [stamp, onDismiss])

  if (!stamp) return null
  const meta = STAMP_META[stamp.type]
  const country = stamp.country_slug ? getPackMeta(stamp.country_slug)?.country ?? null : null

  return (
    <div
      role="dialog"
      aria-live="polite"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4 cursor-pointer"
    >
      <div
        className="relative bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-3xl px-8 py-7 shadow-2xl text-center animate-stamp-burst"
        onClick={e => e.stopPropagation()}
        style={{ color: '#3a2810' }}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 text-amber-900/40 hover:text-amber-900 p-1.5"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-[10px] uppercase tracking-[0.25em] font-extrabold inline-flex items-center gap-1.5 mb-3" style={{ color: '#a37a32' }}>
          <Sparkles className="w-3.5 h-3.5" />
          New stamp earned
          <Sparkles className="w-3.5 h-3.5" />
        </p>
        <div className="flex justify-center mb-3">
          <PassportStamp
            type={stamp.type}
            country={country}
            date={new Date().toISOString()}
            size="md"
            rotate={0}
          />
        </div>
        <p className="text-lg font-extrabold uppercase tracking-widest" style={{ color: meta.ink }}>
          {meta.label}
        </p>
        <p className="text-xs mt-1 opacity-70 max-w-xs mx-auto leading-relaxed">
          {meta.description}
        </p>
        <p className="text-[10px] uppercase tracking-widest opacity-40 mt-4">
          Tap to continue
        </p>
      </div>
    </div>
  )
}
