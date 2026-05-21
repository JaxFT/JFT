'use client'

// Front cover of the kid's Adventure Passport. Shown once per session
// when they first arrive at /kid/<token>. Tap → 3D book-open
// animation → reveals the tab shell. State persists in sessionStorage
// so flipping between tabs (which navigates the URL) doesn't slam the
// cover back in front of them.

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

type Props = {
  childName: string
  childAvatar: string
  token: string
  // What to render once the cover has been opened. Lazy so the heavy
  // tab shell doesn't paint until the kid actually clicks Open.
  children: React.ReactNode
}

const storageKey = (token: string) => `jft.passport.open.${token}`

export default function PassportCover({ childName, childAvatar, token, children }: Props) {
  // 'closed'  = render cover, no animation yet
  // 'opening' = cover swings off, inside fades in
  // 'open'    = cover unmounted, inside fully shown
  const [state, setState] = useState<'closed' | 'opening' | 'open'>('closed')

  // If the kid already opened the passport this session, skip
  // straight to 'open' so navigating tabs doesn't re-show the cover.
  // sessionStorage rather than localStorage so each new device /
  // browser session starts with the open animation again.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (window.sessionStorage.getItem(storageKey(token)) === '1') {
        setState('open')
      }
    } catch {
      // sessionStorage blocked (private window etc) — just show the
      // cover; the kid can tap it and the animation runs as normal.
    }
  }, [token])

  const open = () => {
    if (state !== 'closed') return
    setState('opening')
    try { window.sessionStorage.setItem(storageKey(token), '1') } catch { /* see note above */ }
    // 'opening' for the duration of the keyframe, then unmount cover.
    window.setTimeout(() => setState('open'), 850)
  }

  if (state === 'open') {
    return <>{children}</>
  }

  return (
    <div className="relative pt-10 pb-16 px-4" style={{ perspective: '1400px' }}>
      {/* Inside reveals during the opening animation. Mounted but
          off-screen until 'opening', then animates in. */}
      {state === 'opening' && (
        <div className="animate-inside-reveal">
          {children}
        </div>
      )}

      {/* Cover. Lives over the top of the inside; pinned absolute
          when opening so it can rotate off without pushing layout. */}
      <button
        type="button"
        onClick={open}
        aria-label="Open passport"
        className={`${state === 'opening'
          ? 'absolute inset-0 z-30 animate-cover-open pointer-events-none'
          : 'relative z-30'} block w-full text-left`}
      >
        <CoverFace childName={childName} childAvatar={childAvatar} />
      </button>
    </div>
  )
}

// The cover graphic itself. Leatherette texture + JFT branding + the
// kid's name + avatar. Approximated with CSS — repeating gradients
// for the pebbled leather grain, dark border for the embossed edge,
// gold accents for the lettering. No image assets needed.
function CoverFace({ childName, childAvatar }: { childName: string; childAvatar: string }) {
  return (
    <div
      className="relative w-full max-w-md mx-auto rounded-2xl shadow-2xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01]"
      style={{
        aspectRatio: '3 / 4.2',
        // Layered backgrounds make the leatherette texture: a deep
        // brand-green base, two repeating radial gradients for the
        // pebbled grain, and an angled highlight for the leather
        // sheen.
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.05) 0%, transparent 50%),
          repeating-radial-gradient(circle at 13px 17px, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1.5px, transparent 12px),
          repeating-radial-gradient(circle at 23px 11px, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1.5px, transparent 18px),
          linear-gradient(135deg, #1b4d36 0%, #0f3a2a 55%, #0a2a1e 100%)
        `,
      }}
    >
      {/* Embossed double-line frame */}
      <div
        aria-hidden
        className="absolute inset-3 rounded-xl pointer-events-none"
        style={{ border: '1px solid rgba(212, 175, 105, 0.55)' }}
      />
      <div
        aria-hidden
        className="absolute inset-4 rounded-lg pointer-events-none"
        style={{ border: '1px solid rgba(212, 175, 105, 0.35)' }}
      />

      {/* Spine shadow on the left */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-10 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, transparent 100%)' }}
      />

      <div className="relative h-full flex flex-col items-center justify-between p-8 sm:p-10 text-center">
        <div>
          <p
            className="text-[10px] sm:text-xs font-extrabold tracking-[0.4em] uppercase mb-2"
            style={{ color: '#d4af69' }}
          >
            Jax · Family Travels
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-wide mb-1"
            style={{ color: '#f5e6c6', fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Adventure Passport
          </h1>
          <div
            aria-hidden
            className="mx-auto h-px w-16 mt-3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,105,0.6), transparent)' }}
          />
        </div>

        <div className="my-4 flex flex-col items-center gap-3">
          {/* Kid's avatar sits inside a debossed gold roundel */}
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-5xl sm:text-6xl shadow-inner"
            style={{
              background: 'radial-gradient(circle at 35% 30%, rgba(245,230,198,0.25), rgba(0,0,0,0.35) 70%)',
              border: '2px solid rgba(212,175,105,0.45)',
            }}
            aria-hidden
          >
            {childAvatar}
          </div>
          <p
            className="text-base sm:text-lg font-semibold tracking-widest uppercase"
            style={{ color: '#f5e6c6', letterSpacing: '0.18em' }}
          >
            {childName}
          </p>
        </div>

        <div>
          <p
            className="text-[10px] sm:text-xs font-bold tracking-[0.32em] uppercase mb-2 inline-flex items-center gap-1.5"
            style={{ color: '#d4af69' }}
          >
            <Sparkles className="w-3 h-3" /> Tap to open
          </p>
        </div>
      </div>

      {/* Inner-edge gloss to sell the leatherette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 75% 90%, rgba(0,0,0,0.35) 0%, transparent 60%)',
        }}
      />
    </div>
  )
}
