'use client'

// Bottom slide-in nudge for unauthenticated visitors. Dismissible,
// dismissal persists in localStorage (per-variant) so a "no thanks"
// on a blog post doesn't keep nagging when the same visitor lands on
// other pages later.
//
// Triggers when EITHER 15s of dwell-time passes OR the page has been
// scrolled past 50% of its height — whichever fires first — so we
// only ask after they've engaged with something.
//
// Hidden entirely if signed in (the parent layout passes initialIsSignedIn).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Crown, ArrowRight } from 'lucide-react'

type Variant = 'generic' | 'blog'

const STORAGE_KEY_PREFIX = 'jft.signupNudge.dismissed.'

const COPY: Record<Variant, { eyebrow: string; title: string; freeLine: string }> = {
  generic: {
    eyebrow: 'Welcome',
    title: 'Get more out of Jax | Family Travels',
    freeLine: 'Create a free account to unlock the full France Adventure Pack and join the conversation with likes and comments on every post.',
  },
  blog: {
    eyebrow: 'Enjoying this post?',
    title: 'Get more out of every post',
    freeLine: 'Create a free account to like and comment on this post and unlock the full France Adventure Pack.',
  },
}

const PREMIUM_LINE =
  'Or go Premium for the Adventure Passport, all 80+ Adventure Packs, and unrestricted access to every premium blog and guide.'

export default function SignupNudge({
  variant = 'generic',
  initialIsSignedIn,
}: {
  variant?: Variant
  initialIsSignedIn: boolean
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (initialIsSignedIn) return
    let dismissed = false
    try { dismissed = sessionStorage.getItem(STORAGE_KEY_PREFIX + variant) === '1' } catch { /* ignore */ }
    if (dismissed) return

    let shown = false
    const show = () => {
      if (shown) return
      shown = true
      setOpen(true)
    }

    const dwellTimer = window.setTimeout(show, 15_000)

    const onScroll = () => {
      const doc = document.documentElement
      const scrolled = window.scrollY + window.innerHeight
      const total = Math.max(doc.scrollHeight, 1)
      if (scrolled / total >= 0.5) show()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    // Run once in case the page is already short enough to be 50%+
    // scrolled on first paint.
    onScroll()

    return () => {
      window.clearTimeout(dwellTimer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [variant, initialIsSignedIn])

  const dismiss = () => {
    setOpen(false)
    // Persist the dismiss in localStorage so it survives a refresh,
    // but keyed by variant so dismissing the generic one doesn't also
    // silence the blog-specific one (they have different copy that's
    // worth showing once each).
    try { localStorage.setItem(STORAGE_KEY_PREFIX + variant, '1') } catch { /* ignore */ }
    // Mirror to sessionStorage so the same tab doesn't re-trigger
    // before the next page navigation.
    try { sessionStorage.setItem(STORAGE_KEY_PREFIX + variant, '1') } catch { /* ignore */ }
  }

  // Don't mount the panel at all server-side; reduces SSR HTML noise
  // for the vast majority of viewers who'll never see it.
  if (initialIsSignedIn) return null
  if (!open) return null

  const copy = COPY[variant]

  return (
    <div
      role="dialog"
      aria-labelledby="signup-nudge-title"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-40"
    >
      <div className="bg-brand-950 text-white rounded-2xl shadow-2xl p-5 relative">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-[10px] font-bold tracking-widest uppercase text-brand-300 mb-1">{copy.eyebrow}</p>
        <h2 id="signup-nudge-title" className="font-bold text-base leading-tight mb-2 pr-5">{copy.title}</h2>
        <p className="text-sm text-white/80 leading-relaxed mb-2">{copy.freeLine}</p>
        <p className="text-sm text-white/70 leading-relaxed mb-4">{PREMIUM_LINE}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-sm font-bold bg-white text-brand-900 px-3.5 py-2 rounded-md hover:bg-white/90 transition-colors"
            onClick={() => { try { localStorage.setItem(STORAGE_KEY_PREFIX + variant, '1') } catch {} }}
          >
            Create free account <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white px-2 py-2"
            onClick={() => { try { localStorage.setItem(STORAGE_KEY_PREFIX + variant, '1') } catch {} }}
          >
            <Crown className="w-3.5 h-3.5" /> Go Premium
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-white/60 hover:text-white px-2 py-2 ml-auto"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
