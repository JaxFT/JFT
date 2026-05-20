'use client'

// Adventure-pack browser with continent grouping + free-text search.
// Continents open as collapsibles; inside each one packs are sorted
// alphabetically. The search box filters all packs across continents
// (and auto-expands any group that has a match).

import { useMemo, useState } from 'react'
import { Lock, Crown, ArrowRight, Search, ChevronDown } from 'lucide-react'
import FlagHalfBanner from '@/components/adventure-packs/FlagHalfBanner'
import { CONTINENT_ORDER, SECTION_EMOJI, SECTION_LABELS, type Continent } from '@/lib/adventurePackTypes'
import { getPackSectionKeys } from '@/lib/adventurePackMeta'

type PackLite = {
  slug: string
  country: string
  flag: string
  iso2: string
  isFree: boolean
  continent: Continent
}

export default function AdventurePackBrowser({
  packs,
  isPremium,
  signedIn,
}: {
  packs: PackLite[]
  isPremium: boolean
  signedIn: boolean
}) {
  const [query, setQuery] = useState('')
  // Continents start collapsed. Searching opens any continent that has
  // matches automatically (see `groups` below).
  const [openContinents, setOpenContinents] = useState<Set<Continent>>(new Set())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return packs
    return packs.filter(p => p.country.toLowerCase().includes(q))
  }, [packs, query])

  // Group by continent, sorted alphabetically within each.
  const groups = useMemo(() => {
    const byContinent = new Map<Continent, PackLite[]>()
    for (const c of CONTINENT_ORDER) byContinent.set(c, [])
    for (const p of filtered) byContinent.get(p.continent)?.push(p)
    for (const list of byContinent.values()) {
      list.sort((a, b) => a.country.localeCompare(b.country))
    }
    return CONTINENT_ORDER
      .map(c => ({ continent: c, packs: byContinent.get(c) ?? [] }))
      .filter(g => g.packs.length > 0)
  }, [filtered])

  const isSearching = query.trim().length > 0

  return (
    <div>
      {/* SEARCH BAR */}
      <div className="relative mb-6">
        <Search className="absolute top-1/2 left-3.5 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by country…"
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
          aria-label="Search Adventure Packs"
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No packs match &ldquo;{query}&rdquo; yet.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(({ continent, packs: group }) => {
            // When the user is searching, all groups are open. Otherwise
            // honour the open/closed state.
            const open = isSearching || openContinents.has(continent)
            return (
              <section
                key={continent}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isSearching) return
                    setOpenContinents(prev => {
                      const next = new Set(prev)
                      if (next.has(continent)) next.delete(continent)
                      else next.add(continent)
                      return next
                    })
                  }}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 text-left"
                  aria-expanded={open}
                >
                  <div className="inline-flex items-baseline gap-2.5">
                    <h2 className="text-base font-bold text-gray-900">{continent}</h2>
                    <span className="text-xs font-medium text-gray-500">
                      {group.length} {group.length === 1 ? 'pack' : 'packs'}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`}
                  />
                </button>
                {open && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-5 pb-5 pt-1 border-t border-gray-100">
                    {group.map(p => (
                      <PackCard key={p.slug} pack={p} isPremium={isPremium} signedIn={signedIn} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PackCard({
  pack, isPremium, signedIn,
}: {
  pack: PackLite
  isPremium: boolean
  signedIn: boolean
}) {
  const unlocked = pack.isFree || isPremium
  const showLock = !pack.isFree && !isPremium

  return (
    <article className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm flex flex-col">
      <div className="relative">
        <FlagHalfBanner iso2={pack.iso2} country={pack.country} />
        <span className="absolute top-2 right-2">
          {pack.isFree ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-white text-brand-700 px-2 py-1 rounded-full shadow-sm">Free</span>
          ) : unlocked ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/15 text-white px-2 py-1 rounded-full backdrop-blur-sm">
              <Crown className="w-3 h-3" /> Included
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/15 text-white px-2 py-1 rounded-full backdrop-blur-sm">
              <Lock className="w-3 h-3" /> Premium
            </span>
          )}
        </span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-xs text-gray-500 mb-2">{getPackSectionKeys(pack.slug).length} missions to complete</p>
        {/* Mission emoji strip — 12 mission tiles laid out 6 over 6
            so the card preview mirrors the picker inside the pack. */}
        <div className="grid grid-cols-6 gap-1 mb-3 opacity-80">
          {getPackSectionKeys(pack.slug).map(k => (
            <span
              key={k}
              title={SECTION_LABELS[k]}
              className="text-base leading-none text-center"
              aria-hidden
            >
              {SECTION_EMOJI[k]}
            </span>
          ))}
        </div>
        {!signedIn ? (
          <a
            href={`/login?next=/adventure-packs/${pack.slug}`}
            className="mt-auto btn-primary justify-center !py-2 !px-4 !text-sm"
          >
            Sign in to open <ArrowRight className="w-3.5 h-3.5" />
          </a>
        ) : showLock ? (
          <a
            href="/account"
            className="mt-auto inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-md"
          >
            <Crown className="w-3.5 h-3.5" /> Unlock with Premium
          </a>
        ) : (
          <a
            href={`/adventure-packs/${pack.slug}`}
            className="mt-auto btn-primary justify-center !py-2 !px-4 !text-sm"
          >
            Open pack <ArrowRight className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </article>
  )
}
