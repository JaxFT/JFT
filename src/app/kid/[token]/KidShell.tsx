'use client'

import { useState } from 'react'
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
  const [tab, setTab] = useState<Tab>('passport')

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-900 to-brand-950 text-white">
      {/* HEADER: avatar greeting */}
      <header className="pt-12 pb-6 px-4 text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm text-6xl leading-none shadow-lg mb-4">
          <span aria-hidden>{child.avatar}</span>
        </div>
        <p className="text-xs uppercase tracking-widest text-brand-300 mb-1">Welcome back</p>
        <h1 className="text-3xl font-bold">{child.name} <span aria-hidden>✈️</span></h1>
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
                  onClick={() => setTab(t.id)}
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
        {tab === 'map'       && <MapTab token={token} visits={visits} />}
        {tab === 'countries' && <CountriesTab token={token} visits={visits} />}
        {tab === 'journal'   && <JournalTab token={token} childName={child.name} permissionMode={child.permission_mode} entries={journal} />}
        {tab === 'stamps'    && <StampsTab token={token} stamps={stamps} />}
      </main>
    </div>
  )
}
