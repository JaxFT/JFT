'use client'

// Family-level pack pre-allocation. Lets a parent add an Adventure
// Pack for a country the family hasn't visited yet (e.g. ahead of
// an upcoming trip). Assigning here pushes the pack to every child
// in the family. If the family later visits that country, the
// pre-allocated pack is kept — no duplicate country page appears
// on the kid's passport.
//
// Collapsible card: hidden by default since most parents reach for
// it occasionally rather than every session.

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, ChevronDown, Loader2, Check, Search } from 'lucide-react'
import CountryFlag from '@/components/CountryFlag'
import { CONTINENT_ORDER, type Continent } from '@/lib/adventurePackTypes'

type PackMetaLite = {
  slug: string
  country: string
  flag: string
  iso2: string
  status: 'live' | 'coming-soon'
  continent: Continent
}

export default function PackAllocationSection({
  allPacks,
  initialAllocatedSlugs,
}: {
  allPacks: PackMetaLite[]
  // Pack slugs currently assigned to at least one child in the
  // family. Drives the "already assigned" / "available" split.
  initialAllocatedSlugs: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [allocated, setAllocated] = useState<Set<string>>(new Set(initialAllocatedSlugs))
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Live packs only — coming-soon are previews on the marketing
  // pages, not yet allocatable.
  const livePacks = useMemo(
    () => allPacks.filter(p => p.status === 'live'),
    [allPacks],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return livePacks
    return livePacks.filter(p => p.country.toLowerCase().includes(q))
  }, [livePacks, query])

  const byContinent = useMemo(() => {
    const m: Record<string, PackMetaLite[]> = {}
    for (const p of filtered) {
      ;(m[p.continent] ??= []).push(p)
    }
    for (const arr of Object.values(m)) arr.sort((a, b) => a.country.localeCompare(b.country))
    return m
  }, [filtered])

  const assign = async (slug: string) => {
    setBusy(slug)
    setError(null)
    try {
      const res = await fetch('/api/family/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_slug: slug }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setAllocated(prev => new Set(prev).add(slug))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign pack')
    } finally {
      setBusy(null)
    }
  }

  const allocatedCount = allocated.size
  const availableCount = livePacks.length - allocatedCount

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-6 text-left"
        aria-expanded={open}
      >
        <Compass className="w-5 h-5 text-brand-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">Adventure packs</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pre-allocate packs for countries you haven&apos;t visited yet. Applies to every child in the family.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-gray-900">{allocatedCount} assigned</p>
          <p className="text-[10px] text-gray-500">{availableCount} available</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-5">
          <div className="relative mb-4">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search country..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {CONTINENT_ORDER.filter(c => byContinent[c]?.length).map(continent => (
            <div key={continent} className="mb-5 last:mb-0">
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-2">{continent}</p>
              <ul className="space-y-1.5">
                {byContinent[continent].map(p => {
                  const isAssigned = allocated.has(p.slug)
                  const isBusy = busy === p.slug
                  return (
                    <li
                      key={p.slug}
                      className="flex items-center gap-3 p-2 rounded-md bg-gray-50"
                    >
                      <CountryFlag iso2={p.iso2} country={p.country} ariaHidden size="md" />
                      <span className="font-semibold text-gray-900 text-sm flex-1 min-w-0 truncate">{p.country}</span>
                      {isAssigned ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Assigned
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => assign(p.slug)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1 rounded-md disabled:opacity-60"
                        >
                          {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Assign</>}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-gray-500 italic">No packs match &quot;{query}&quot;.</p>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3">{error}</p>
          )}
        </div>
      )}
    </section>
  )
}
