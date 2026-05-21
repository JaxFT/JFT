'use client'

import { useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Stamp, Map, Globe, BookOpen, Star } from 'lucide-react'
import type { PermissionMode } from '@/lib/passport-types'
import type {
  StampRow, KidStats, CountryVisitRow, AssignedPackRow,
} from '@/lib/passport-kid-db'
import type { JournalEntryRow } from '@/lib/passport-journal-db'
import PassportTab from './tabs/PassportTab'
import StampsTab from './tabs/StampsTab'
import MapTab from './tabs/MapTab'
import CountriesTab from './tabs/CountriesTab'
import JournalTab from './tabs/JournalTab'
import PassportCover, { closePassport } from './PassportCover'

type Tab = 'passport' | 'map' | 'countries' | 'journal' | 'stamps'

const TABS: { id: Tab; label: string; icon: typeof Stamp }[] = [
  { id: 'passport',  label: 'Passport',  icon: Star },
  { id: 'map',       label: 'Map',       icon: Map },
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'journal',   label: 'Journal',   icon: BookOpen },
  { id: 'stamps',    label: 'Stamps',    icon: Stamp },
]

type Child = {
  id: string
  name: string
  avatar: string
  permission_mode: PermissionMode
  home_country_iso2: string | null
}

export default function KidShell({
  token,
  child,
  stats,
  stamps,
  visits,
  assignedPacks,
  journal,
}: {
  token: string
  child: Child
  stats: KidStats
  stamps: StampRow[]
  visits: CountryVisitRow[]
  assignedPacks: AssignedPackRow[]
  journal: JournalEntryRow[]
}) {
  // Tab state lives in the URL (?tab=stamps etc) so the browser back
  // button takes the kid back to whichever tab they were on, rather
  // than always defaulting to Passport.
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab')
  const tab: Tab = (TABS.find(t => t.id === rawTab)?.id) ?? 'passport'

  const goToTab = (id: Tab) => {
    if (id === tab) return
    router.push(`/kid/${token}?tab=${id}`, { scroll: false })
  }

  // ── Whole-book navigation ─────────────────────────────────────────
  // The passport reads as a single book: Passport (landing) → Map →
  // Countries → Journal → Stamps. Swipe-left walks forward, swipe-
  // right walks backward. On the first tab, swipe-right closes the
  // cover. On the last tab, the Stamps tab handles its own internal
  // page navigation; only when the kid swipes past its first internal
  // page do they cross back into the Journal tab.
  const TAB_ORDER: Tab[] = ['passport', 'map', 'countries', 'journal', 'stamps']
  const tabIndex = TAB_ORDER.indexOf(tab)
  const goToPrevSurface = () => {
    if (tabIndex <= 0) closePassport()
    else goToTab(TAB_ORDER[tabIndex - 1])
  }
  const goToNextSurface = () => {
    if (tabIndex < TAB_ORDER.length - 1) goToTab(TAB_ORDER[tabIndex + 1])
    // else: kid is on the last tab; their internal handler runs the
    // edge of the book on its own.
  }

  // Gesture handler for the non-Stamps tabs. Stamps has its own
  // handler inside its component because it also tracks internal
  // page state; lifting both into here would tangle concerns.
  const SWIPE_MIN_PX = 70
  const SWIPE_MAX_MS = 700
  const TAP_MAX_MOVE = 8
  const TAP_MAX_MS = 400
  const EDGE_FRACTION = 0.18
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const onMainPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (tab === 'stamps') return
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, input, textarea, select, [role="button"]')) {
      swipeStartRef.current = null
      return
    }
    swipeStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
  }
  const onMainPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (tab === 'stamps') return
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const elapsed = Date.now() - start.time
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx >= SWIPE_MIN_PX && absDx >= absDy * 1.5 && elapsed <= SWIPE_MAX_MS) {
      if (dx < 0) goToNextSurface()
      else goToPrevSurface()
      return
    }
    if (absDx <= TAP_MAX_MOVE && absDy <= TAP_MAX_MOVE && elapsed <= TAP_MAX_MS) {
      const surface = e.currentTarget.getBoundingClientRect()
      const relX = (e.clientX - surface.left) / surface.width
      if (relX < EDGE_FRACTION) goToPrevSurface()
      else if (relX > 1 - EDGE_FRACTION) goToNextSurface()
    }
  }

  // Inside-of-passport markup is wrapped by <PassportCover> on first
  // session arrival. On subsequent renders (after Open is tapped or
  // sessionStorage already says it's open) the cover unmounts and
  // the original layout takes over with zero extra wrapping.
  const insideContent = (
    <div className="bg-gradient-to-b from-brand-900 to-brand-950 text-white">
      {/* HEADER */}
      <header className="pt-6 pb-4 px-4 flex justify-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm text-3xl leading-none shadow-md shrink-0">
            <span aria-hidden>{child.avatar}</span>
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-widest text-brand-300">Welcome back</p>
            <h1 className="text-xl font-bold">{child.name}</h1>
          </div>
        </div>
      </header>

      {/* TAB BAR */}
      <nav className="sticky top-0 z-20 bg-brand-950/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-3xl mx-auto px-2 sm:px-4">
          <div className="flex justify-around">
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => goToTab(t.id)}
                  className={`flex-1 inline-flex flex-col items-center gap-1 py-3 transition-colors text-xs font-semibold uppercase tracking-widest ${
                    active
                      ? 'text-white border-b-2 border-brand-300'
                      : 'text-white/50 hover:text-white/80 border-b-2 border-transparent'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* PANEL. Swipe handlers live here so the whole passport
          reads as one book: swipe between tabs except inside Stamps,
          which owns its own page-turn gesture. */}
      <main
        className="max-w-3xl mx-auto px-4 pt-6 pb-20"
        onPointerDown={onMainPointerDown}
        onPointerUp={onMainPointerUp}
        onPointerCancel={() => { swipeStartRef.current = null }}
        style={{ touchAction: 'pan-y' }}
      >
        {tab === 'passport'  && <PassportTab token={token} child={child} stats={stats} stamps={stamps} assignedPacks={assignedPacks} />}
        {tab === 'map'       && <MapTab token={token} visits={visits} homeCountryIso2={child.home_country_iso2} />}
        {tab === 'countries' && <CountriesTab token={token} visits={visits} stamps={stamps} assignedPacks={assignedPacks} homeCountryIso2={child.home_country_iso2} />}
        {tab === 'journal'   && <JournalTab token={token} childName={child.name} permissionMode={child.permission_mode} entries={journal} />}
        {tab === 'stamps'    && (
          <StampsTab
            token={token}
            stamps={stamps}
            visits={visits}
            homeCountryIso2={child.home_country_iso2}
            onSwipeBeforeFirstPage={goToPrevSurface}
            onSwipeAfterLastPage={goToNextSurface}
          />
        )}
      </main>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-900 to-brand-950 text-white">
      {/* Cover wraps the inside on first session arrival; on
          subsequent renders it short-circuits and renders the
          inside directly so the original spacing applies. Outer
          dark-gradient wrapper here keeps the cover floating on the
          brand background. */}
      <PassportCover
        childName={child.name}
        childAvatar={child.avatar}
        token={token}
      >
        {insideContent}
      </PassportCover>
    </div>
  )
}
