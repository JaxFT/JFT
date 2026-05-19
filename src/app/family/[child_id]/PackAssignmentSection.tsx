'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, Plus, X, Loader2, Crown, Search, ChevronDown } from 'lucide-react'
import { CONTINENT_ORDER, type Continent } from '@/lib/adventurePackTypes'
import CountryFlag from '@/components/CountryFlag'

type PackMetaLite = {
  slug: string
  country: string
  flag: string
  iso2: string
  status: 'live' | 'coming-soon'
  continent: Continent
}

export default function PackAssignmentSection({
  childId,
  initialAssigned,
  allPacks,
}: {
  childId: string
  initialAssigned: string[]
  allPacks: PackMetaLite[]
}) {
  const router = useRouter()
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initialAssigned))
  const [busy, setBusy] = useState<string | null>(null) // slug currently mutating
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [openContinents, setOpenContinents] = useState<Set<Continent>>(new Set())

  // Two lists: the ones already assigned (shown as removable chips at
  // the top), and the available ones (live packs only — coming-soon
  // packs aren't assignable yet).
  const assignedPacks = useMemo(
    () => allPacks.filter(p => assigned.has(p.slug)),
    [allPacks, assigned],
  )

  // Group unassigned live packs by continent, sorted alphabetically.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const available = allPacks.filter(p =>
      p.status === 'live'
      && !assigned.has(p.slug)
      && (q === '' || p.country.toLowerCase().includes(q))
    )
    const byContinent = new Map<Continent, PackMetaLite[]>()
    for (const c of CONTINENT_ORDER) byContinent.set(c, [])
    for (const p of available) byContinent.get(p.continent)?.push(p)
    for (const list of byContinent.values()) {
      list.sort((a, b) => a.country.localeCompare(b.country))
    }
    return CONTINENT_ORDER
      .map(c => ({ continent: c, packs: byContinent.get(c) ?? [] }))
      .filter(g => g.packs.length > 0)
  }, [allPacks, assigned, query])

  const isSearching = query.trim().length > 0
  const availableCount = groups.reduce((n, g) => n + g.packs.length, 0)

  const assign = async (slug: string) => {
    setBusy(slug)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_slug: slug }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setAssigned(prev => new Set(prev).add(slug))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign pack')
    } finally {
      setBusy(null)
    }
  }

  const unassign = async (slug: string) => {
    setBusy(slug)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/assignments/${slug}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setAssigned(prev => {
        const next = new Set(prev)
        next.delete(slug)
        return next
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unassign pack')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Adventure Packs</h2>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        Pick which packs this child can use. Different kids in the family can have different packs.
      </p>

      {/* Assigned */}
      {assignedPacks.length > 0 ? (
        <div className="mb-5">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Assigned ({assignedPacks.length})</p>
          <div className="flex flex-wrap gap-2">
            {assignedPacks.map(p => (
              <div
                key={p.slug}
                className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-900 rounded-full pl-2.5 pr-1.5 py-1 text-sm"
              >
                <CountryFlag iso2={p.iso2} country={p.country} ariaHidden size="sm" />
                <span className="font-semibold">{p.country}</span>
                <button
                  onClick={() => unassign(p.slug)}
                  disabled={busy === p.slug}
                  className="text-brand-700 hover:text-brand-900 disabled:opacity-50 -mr-0.5 p-1"
                  aria-label={`Unassign ${p.country}`}
                >
                  {busy === p.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic mb-5">No packs assigned yet.</p>
      )}

      {/* Available — grouped by continent, with a search box. */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">
            Available ({availableCount})
          </p>
        </div>

        <div className="relative mb-3">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by country…"
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
            aria-label="Search Adventure Packs"
          />
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            {isSearching ? `No matches for "${query}".` : 'All available packs are already assigned.'}
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map(({ continent, packs: group }) => {
              const open = isSearching || openContinents.has(continent)
              return (
                <div key={continent} className="border border-gray-100 rounded-lg overflow-hidden">
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
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
                    aria-expanded={open}
                  >
                    <span className="inline-flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-gray-800">{continent}</span>
                      <span className="text-[11px] text-gray-500">
                        {group.length} {group.length === 1 ? 'pack' : 'packs'}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`}
                    />
                  </button>
                  {open && (
                    <div className="flex flex-wrap gap-2 p-3">
                      {group.map(p => (
                        <button
                          key={p.slug}
                          onClick={() => assign(p.slug)}
                          disabled={busy === p.slug}
                          className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 rounded-full pl-2.5 pr-3 py-1 text-sm disabled:opacity-50"
                        >
                          <CountryFlag iso2={p.iso2} country={p.country} ariaHidden size="sm" />
                          <span>{p.country}</span>
                          {busy === p.slug
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Plus className="w-3.5 h-3.5 text-brand-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">{error}</p>
      )}

      {/* Footnote about France being free and coming-soon vs live */}
      <p className="text-xs text-gray-400 mt-5 inline-flex items-start gap-1.5">
        <Crown className="w-3 h-3 mt-0.5 shrink-0" />
        Premium covers every assigned pack for every child. Free for life on France, included on the rest.
      </p>
    </section>
  )
}
