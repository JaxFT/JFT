'use client'

// Bottom banner nudging a signed-in account holder who hasn't set up
// a Travel Profile yet. Dismissible, dismissal persists in
// localStorage — same pattern as SignupNudge, just for signed-in
// users instead of anonymous visitors. Shows immediately (no
// dwell/scroll gate, unlike SignupNudge), this is an existing
// customer being told about a feature that already exists for them,
// not a cold pitch that needs warming up.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Compass, X } from 'lucide-react'

const STORAGE_KEY = 'jft.travelProfileNudge.dismissed'

const EXCLUDED_PATTERNS: RegExp[] = [
  /^\/login(\/|$)/,
  /^\/signup(\/|$)/,
  /^\/auth\//,
  /^\/admin(\/|$)/,
  /^\/kid\//,
  /^\/travel-profile(\/|$)/,
]

export default function TravelProfileNudge({
  initialIsSignedIn,
  hasTravelProfile,
}: {
  initialIsSignedIn: boolean
  hasTravelProfile: boolean
}) {
  const pathname = usePathname() ?? '/'
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!initialIsSignedIn || hasTravelProfile) return
    let dismissed = false
    try { dismissed = localStorage.getItem(STORAGE_KEY) === '1' } catch { /* ignore */ }
    if (!dismissed) setOpen(true)
  }, [initialIsSignedIn, hasTravelProfile])

  if (!initialIsSignedIn || hasTravelProfile) return null
  if (EXCLUDED_PATTERNS.some(rx => rx.test(pathname))) return null
  if (!open) return null

  const dismiss = () => {
    setOpen(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 print:hidden">
      <div className="bg-brand-950 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.18)]">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Compass className="w-4 h-4 shrink-0" />
            <span>Set up your Travel Profile, add where you&apos;ve been, meet other travellers, and unlock a free Adventure Pack.</span>
          </span>
          <Link
            href="/travel-profile"
            className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-bold text-brand-700 hover:bg-white/90 transition-colors"
          >
            Set it up
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-white/60 hover:text-white p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
