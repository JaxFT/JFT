// Header (avatar + "Welcome back" + name) and sticky tab nav, reused
// by the main KidShell and the kid country page so the kid can jump
// to any passport section from anywhere inside their book, instead of
// having to back-button their way out of a country page first.
//
// Server-component compatible: uses Next <Link> for the tab buttons,
// no client state, no animations. KidShell still owns its animated
// tab-flipping experience; this is the lightweight version for sub-
// pages where in-place animation isn't worth the complexity.

import Link from 'next/link'
import { Stamp, Map, Globe, BookOpen, Star } from 'lucide-react'

type Tab = 'passport' | 'map' | 'countries' | 'journal' | 'stamps'

const TABS: { id: Tab; label: string; icon: typeof Stamp }[] = [
  { id: 'passport',  label: 'Passport',  icon: Star },
  { id: 'map',       label: 'Map',       icon: Map },
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'journal',   label: 'Journal',   icon: BookOpen },
  { id: 'stamps',    label: 'Stamps',    icon: Stamp },
]

export default function KidChrome({
  token,
  childName,
  childAvatar,
  activeTab,
}: {
  token: string
  childName: string
  childAvatar: string
  // Pass the tab id that should be highlighted, or null if the kid is
  // on a sub-page like /kid/<token>/country/<slug> where none of the
  // top-level tabs are technically active.
  activeTab: Tab | null
}) {
  return (
    <>
      {/* HEADER */}
      <header className="pt-6 pb-4 px-4 flex justify-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm text-3xl leading-none shadow-md shrink-0">
            <span aria-hidden>{childAvatar}</span>
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-widest text-brand-300">Welcome back</p>
            <h1 className="text-xl font-bold">{childName}</h1>
          </div>
        </div>
      </header>

      {/* TAB BAR. Each tab links to /kid/<token>?tab=<id>; the
          PassportTab landing is just /kid/<token>. */}
      <nav className="sticky top-0 z-20 bg-brand-950/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-3xl mx-auto px-2 sm:px-4">
          <div className="flex justify-around">
            {TABS.map(t => {
              const Icon = t.icon
              const active = activeTab === t.id
              const href = t.id === 'passport'
                ? `/kid/${token}`
                : `/kid/${token}?tab=${t.id}`
              return (
                <Link
                  key={t.id}
                  href={href}
                  className={`flex-1 inline-flex flex-col items-center gap-1 py-3 transition-colors text-xs font-semibold uppercase tracking-widest ${
                    active
                      ? 'text-white border-b-2 border-brand-300'
                      : 'text-white/50 hover:text-white/80 border-b-2 border-transparent'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
