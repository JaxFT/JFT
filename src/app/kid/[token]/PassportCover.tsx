'use client'

// Front cover of the kid's Adventure Passport. Four states:
//   - 'closed'  : only the cover is visible, tap or swipe-left to open
//   - 'opening' : cover rotates 0 → -180° around its left edge,
//                 backface-visibility hides it as it passes 90°
//   - 'open'    : cover unmounted, inside content shown
//   - 'closing' : inside hidden again, cover re-mounts at -180° and
//                 rotates back to 0° (triggered by a window event
//                 fired from inside, see closePassport())
//
// Important visual rule: the inside content is NOT rendered during
// 'closed', 'opening', or 'closing'. The cover transition runs over
// the dark passport background only. This avoids the "see-through"
// glitch where the previous inside page peeked through the rotating
// cover.

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
const OPEN_MS = 900
const CLOSE_MS = 900

export function closePassport() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CLOSE_EVENT))
}

export default function PassportCover({ childName, childAvatar, token, children }: Props) {
  const [state, setState] = useState<State>('closed')

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (window.sessionStorage.getItem(storageKey(token)) === '1') {
        setState('open')
      }
    } catch { /* private window */ }
  }, [token])

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

  // Once the close animation finishes, drop back to 'closed' so only
  // the cover is on screen again.
  useEffect(() => {
    if (state !== 'closing') return
    const t = window.setTimeout(() => setState('closed'), CLOSE_MS + 30)
    return () => window.clearTimeout(t)
  }, [state])

  const open = useCallback(() => {
    setState(prev => {
      if (prev !== 'closed') return prev
      try { window.sessionStorage.setItem(storageKey(token), '1') } catch { /* noop */ }
      return 'opening'
    })
  }, [token])

  // Once the open animation finishes, drop the cover and show inside.
  useEffect(() => {
    if (state !== 'opening') return
    const t = window.setTimeout(() => setState('open'), OPEN_MS + 30)
    return () => window.clearTimeout(t)
  }, [state])

  // ── Cover gestures: tap OR swipe-left to open ──────────────────
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
    if (dx < -70 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 700) {
      open()
    }
  }

  // Open state: cover gone, inside fully shown. No 3D wrapper, no
  // animations in flight. Clean pass-through.
  if (state === 'open') {
    return <>{children}</>
  }

  // Cover-only states ('closed', 'opening', 'closing'). The cover
  // lives inside a preserve-3d parent so its rotateY animation
  // works as a real 3D flip. The inside content is intentionally
  // NOT rendered here.
  const coverAnimation =
    state === 'opening' ? 'animate-cover-open-3d' :
    state === 'closing' ? 'animate-cover-close-3d' :
    ''

  // Cover is non-interactive once the animation is mid-flight; only
  // a fully-closed cover responds to gestures.
  const interactive = state === 'closed'

  return (
    <div className="relative pt-10 pb-16 px-4" style={{ perspective: '1400px' }}>
      <div
        className="relative mx-auto"
        style={{
          transformStyle: 'preserve-3d',
          maxWidth: '28rem',
        }}
      >
        <button
          type="button"
          onClick={interactive ? open : undefined}
          onPointerDown={interactive ? onCoverPointerDown : undefined}
          onPointerUp={interactive ? onCoverPointerUp : undefined}
          aria-label="Open passport (tap or swipe left)"
          tabIndex={interactive ? 0 : -1}
          disabled={!interactive}
          className={`block w-full text-left ${coverAnimation}`}
          style={{
            touchAction: 'pan-y',
            cursor: interactive ? 'pointer' : 'default',
            // The cover starts visible when 'closed' (rotateY 0) and
            // when 'closing' (the close animation starts at -180°,
            // which is back-facing-hidden, then rotates to 0°).
            // Inline initial transform matches the from-frame of the
            // active keyframe so the first paint has no jump.
            transform: state === 'closing' ? 'rotateY(-180deg)' : 'rotateY(0deg)',
            transformOrigin: 'left center',
            backfaceVisibility: 'hidden',
          }}
        >
          <CoverFace childName={childName} childAvatar={childAvatar} />
        </button>
      </div>
    </div>
  )
}

function CoverFace({ childName, childAvatar }: { childName: string; childAvatar: string }) {
  return (
    <div
      className="relative w-full rounded-2xl shadow-2xl overflow-hidden"
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
