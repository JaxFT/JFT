'use client'

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-900 to-brand-950 text-white">
      {/* HEADER: avatar on the left, two lines of greeting on the
          right. Compact so the book pages below get more room. */}
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

      {/* PANEL */}
      <main className="max-w-3xl mx-auto px-4 pt-6 pb-20">
        {tab === 'passport'  && <PassportTab token={token} child={child} stats={stats} stamps={stamps} assignedPacks={assignedPacks} />}
        {tab === 'map'       && <MapTab token={token} visits={visits} homeCountryIso2={child.home_country_iso2} />}
        {tab === 'countries' && <CountriesTab token={token} visits={visits} stamps={stamps} assignedPacks={assignedPacks} homeCountryIso2={child.home_country_iso2} />}
        {tab === 'journal'   && <JournalTab token={token} childName={child.name} permissionMode={child.permission_mode} entries={journal} />}
        {tab === 'stamps'    && <StampsTab token={token} stamps={stamps} visits={visits} homeCountryIso2={child.home_country_iso2} />}
      </main>
    </div>
  )
}
