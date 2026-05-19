'use client'

// Prominent back button used on every drill-down page in the kid
// passport (country pages, pack pages, future detail screens).
//
// Uses router.back() so the kid returns to wherever they came from —
// preserving the tab they were on (Stamps / Map / Countries) via the
// URL-encoded tab state in KidShell. If they landed directly via QR
// scan with no history, we fall back to the kid passport home.

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function KidBackButton({
  fallbackHref,
  label = 'Back',
  variant = 'onDark',
}: {
  // Where to go if there's no browser history to pop back to.
  fallbackHref: string
  label?: string
  // Two colour variants depending on the surrounding chrome.
  variant?: 'onDark' | 'onPaper'
}) {
  const router = useRouter()

  const onClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  const styles = variant === 'onDark'
    ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
    : 'bg-white/60 hover:bg-white text-amber-900 border-amber-900/20'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-full border transition-colors ${styles}`}
      aria-label={label}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  )
}
