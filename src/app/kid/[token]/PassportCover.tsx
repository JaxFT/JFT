'use client'

// Front cover of the kid's Adventure Passport. Three states:
//   - 'closed'  : the cover is shown, tap to open
//   - 'opening' : 3D book-open animation playing
//   - 'open'    : inside content fully visible, cover unmounted
//   - 'closing' : cover swinging back closed (triggered by a global
//                 'jft:close-passport' window event so the Stamps tab
//                 can fire it from a swipe-right past the first page)
//
// State persists in sessionStorage so flipping between tabs doesn't
// slam the cover back in front of the kid. The close event is the
// only way to leave 'open' back to the cover within a single session.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'

type Props = {
  childName: string
  childAvatar: string
  token: string
  children: React.ReactNode
}

type State = 'closed' | 'opening' | 'open' | 'closing'

const storageKey = (token: string) => `jft.passport.open.${token}`
const CLOSE_EVENT = 'jft:close-passport'

// Public helper any child component can call. Lives in this module so
// imports stay obvious; under the hood it dispatches a window event
// the cover listens for.
export function closePassport() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CLOSE_EVENT))
}

export default function PassportCover({ childName, childAvatar, token, children }: Props) {
  const [state, setState] = useState<State>('closed')

  // On first mount, restore the open flag for this session.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (window.sessionStorage.getItem(storageKey(token)) === '1') {
        setState('open')
      }
    } catch { /* private window etc */ }
  }, [token])

  // Global close event — fired from inside the passport when the kid
  // wants to "shut the book". We replay the cover close animation
  // and clear the session flag so next open replays the opening too.
  const onCloseRequest = useCallback(() => {
    setState(prev => {
      if (prev !== 'open') return prev
      try { window.sessionStorage.removeItem(storageKey(token)) } catch { /* noop */ }
      return 'closing'
    })
  }, [token])

  useEffect(() => {
    window.addEventListener(CLOSE_EVENT, onCloseRequest)
    return () => window.removeEventListener(CLOSE_EVENT, onCloseRequest)
  }, [onCloseRequest])

  // Once the closing animation finishes, drop back to 'closed' so the
  // cover is the only thing on screen again.
  useEffect(() => {
    if (state !== 'closing') return
    const t = window.setTimeout(() => setState('closed'), 950)
    return () => window.clearTimeout(t)
  }, [state])

  const open = () => {
    if (state !== 'closed') return
    setState('opening')
    try { window.sessionStorage.setItem(storageKey(token), '1') } catch { /* noop */ }
    window.setTimeout(() => setState('open'), 850)
  }

  // Cover gestures: tap fires the click handler; a definite swipe-
  // left (forward, "next page") also opens. We track pointerdown +
  // pointerup ourselves so the swipe doesn't compete with the click.
  const coverDownRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const onCoverPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    coverDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
  }
  const onCoverPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = coverDownRef.current
    coverDownRef.current = null
    if (!start || state !== 'closed') return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const elapsed = Date.now() - start.time
    // Swipe-left opens. Same thresholds as the page-turn gesture so
    // muscle-memory carries from one to the other.
    if (dx < -70 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 700) {
      open()
    }
  }

  if (state === 'open') {
    return <>{children}</>
  }

  // For 'closed' / 'opening' / 'closing' we render the cover + the
  // inside together so the 3D rotation reveals what's behind.
  const insideAnim =
    state === 'opening' ? 'animate-inside-reveal' :
    state === 'closing' ? 'animate-inside-hide' :
    'hidden'
  const coverAnim =
    state === 'opening' ? 'animate-cover-open' :
    state === 'closing' ? 'animate-cover-close' :
    ''
  const coverPointerEvents =
    state === 'opening' || state === 'closing' ? 'pointer-events-none' : ''

  return (
    <div className="relative pt-10 pb-16 px-4" style={{ perspective: '1400px' }}>
      {/* Inside content: hidden when fully closed, animated in when
          opening, animated out when closing. */}
      <div className={`${insideAnim}`}>
        {state === 'closed' ? null : children}
      </div>

      {/* Cover. Sits over the inside; goes absolute during the
          open/close animations so it can rotate without pushing the
          rest of the layout around. */}
      <button
        type="button"
        onClick={open}
        onPointerDown={onCoverPointerDown}
        onPointerUp={onCoverPointerUp}
        aria-label="Open passport (tap or swipe left)"
        className={`${state === 'opening' || state === 'closing'
          ? 'absolute inset-0 z-30'
          : 'relative z-30'} block w-full text-left ${coverAnim} ${coverPointerEvents}`}
        style={{ touchAction: 'pan-y' }}
      >
        <CoverFace childName={childName} childAvatar={childAvatar} />
      </button>
    </div>
  )
}

function CoverFace({ childName, childAvatar }: { childName: string; childAvatar: string }) {
  return (
    <div
      className="relative w-full max-w-md mx-auto rounded-2xl shadow-2xl overflow-hidden cursor-pointer transition-transform hover:scale-[1.01]"
      style={{
        aspectRatio: '3 / 4.2',
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.05) 0%, transparent 50%),
          repeating-radial-gradient(circle at 13px 17px, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1.5px, transparent 12px),
          repeating-radial-gradient(circle at 23px 11px, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1.5px, transparent 18px),
          linear-gradient(135deg, #1b4d36 0%, #0f3a2a 55%, #0a2a1e 100%)
        `,
      }}
    >
      <div aria-hidden className="absolute inset-3 rounded-xl pointer-events-none" style={{ border: '1px solid rgba(212, 175, 105, 0.55)' }} />
      <div aria-hidden className="absolute inset-4 rounded-lg pointer-events-none" style={{ border: '1px solid rgba(212, 175, 105, 0.35)' }} />
      <div aria-hidden className="absolute inset-y-0 left-0 w-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, transparent 100%)' }} />

      <div className="relative h-full flex flex-col items-center justify-between p-8 sm:p-10 text-center">
        <div>
          <p className="text-[10px] sm:text-xs font-extrabold tracking-[0.4em] uppercase mb-2" style={{ color: '#d4af69' }}>
            Jax · Family Travels
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wide mb-1" style={{ color: '#f5e6c6', fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Adventure Passport
          </h1>
          <div aria-hidden className="mx-auto h-px w-16 mt-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,105,0.6), transparent)' }} />
        </div>

        <div className="my-4 flex flex-col items-center gap-3">
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
          <p className="text-base sm:text-lg font-semibold tracking-widest uppercase" style={{ color: '#f5e6c6', letterSpacing: '0.18em' }}>
            {childName}
          </p>
        </div>

        <div>
          <p className="text-[10px] sm:text-xs font-bold tracking-[0.32em] uppercase mb-2 inline-flex items-center gap-1.5" style={{ color: '#d4af69' }}>
            <Sparkles className="w-3 h-3" /> Tap or swipe to open
          </p>
        </div>
      </div>

      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 75% 90%, rgba(0,0,0,0.35) 0%, transparent 60%)' }} />
    </div>
  )
}
