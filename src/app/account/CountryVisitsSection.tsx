'use client'

// Lets a parent edit, add or remove country visits. Visits are now
// stored at the FAMILY level — one shared list per parent that
// shows on every child's passport. The first_visit_date is the
// moment that country lights up on the map.
//
// The country picker spans every ISO 3166-1 country, not just the
// Adventure Pack countries. Non-pack visits still get a Stamps
// tab page; they just don't have Adventure Pack content yet.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Plus, X, Loader2, Calendar, Search } from 'lucide-react'
import { COUNTRIES, getCountryByIso2 } from '@/lib/countries'
import { getPackByIso2 } from '@/lib/adventurePackMeta'
import CountryFlag from '@/components/CountryFlag'

type VisitRow = {
  iso2: string
  first_visit_date: string // YYYY-MM-DD
}

// Family-level section. The visits API routes still carry a child
// id segment for path backwards compat, but the server scopes by
// auth.uid() — we just pass any child id from the family (the
// caller picks one; if there are no children yet the section
// doesn't render).
export default function CountryVisitsSection({
  scopeChildId,
  initialVisits,
}: {
  scopeChildId: string
  initialVisits: VisitRow[]
}) {
  const childId = scopeChildId
  const router = useRouter()
  const [visits, setVisits] = useState<VisitRow[]>(initialVisits)
  const [busy, setBusy] = useState<string | null>(null) // iso2 being mutated
  const [error, setError] = useState<string | null>(null)

  // Form state for adding a new visit.
  const [addIso2, setAddIso2] = useState<string>('')
  const [addDate, setAddDate] = useState<string>(today())
  const [adding, setAdding] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Available countries: every ISO country except those already
  // visited and Antarctica. Filtered by the search query.
  const visitedIso2Set = useMemo(
    () => new Set(visits.map(v => v.iso2.toLowerCase())),
    [visits],
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return COUNTRIES
      .filter(c => c.continent !== 'Antarctica')
      .filter(c => !visitedIso2Set.has(c.iso2))
      .filter(c => !q || c.name.toLowerCase().includes(q))
  }, [query, visitedIso2Set])

  const updateDate = async (iso2: string, newDate: string) => {
    setBusy(iso2)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/visits/${iso2}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_visit_date: newDate }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setVisits(prev => prev.map(v => v.iso2 === iso2 ? { ...v, first_visit_date: newDate } : v))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update date')
    } finally {
      setBusy(null)
    }
  }

  const removeVisit = async (iso2: string) => {
    setBusy(iso2)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/visits/${iso2}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setVisits(prev => prev.filter(v => v.iso2 !== iso2))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove visit')
    } finally {
      setBusy(null)
    }
  }

  const addVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addIso2 || !addDate) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iso2: addIso2, first_visit_date: addDate }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setVisits(prev => [{ iso2: addIso2, first_visit_date: addDate }, ...prev])
      setAddIso2('')
      setQuery('')
      setPickerOpen(false)
      setAddDate(today())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add visit')
    } finally {
      setAdding(false)
    }
  }

  const addCountryName = addIso2 ? (getCountryByIso2(addIso2)?.name ?? '') : ''

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Country visits</h2>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        Where the family has travelled. Shared across every child in the family, adding here lights up the map on
        every passport. We auto-add a visit when a kid first opens a country&apos;s Adventure Pack, or you can
        backdate trips you took before you started using JFT.
      </p>

      {/* Existing visits */}
      {visits.length > 0 ? (
        <ul className="space-y-2 mb-5">
          {visits.map(v => {
            const country = getCountryByIso2(v.iso2)
            const name = country?.name ?? v.iso2.toUpperCase()
            const hasPack = !!getPackByIso2(v.iso2)
            const isBusy = busy === v.iso2
            return (
              <li
                key={v.iso2}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <CountryFlag iso2={v.iso2} country={name} ariaHidden size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{name}</p>
                  {!hasPack && (
                    <p className="text-[10px] uppercase tracking-widest text-gray-400">No pack yet</p>
                  )}
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <input
                    type="date"
                    value={v.first_visit_date}
                    max={today()}
                    disabled={isBusy}
                    onChange={e => {
                      const newDate = e.target.value
                      if (newDate && newDate !== v.first_visit_date) updateDate(v.iso2, newDate)
                    }}
                    className="text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeVisit(v.iso2)}
                  disabled={isBusy}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-50 p-1"
                  aria-label={`Remove ${name} visit`}
                  title="Remove"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic mb-5">No country visits yet.</p>
      )}

      {/* Add a visit */}
      <form onSubmit={addVisit} className="border-t border-gray-100 pt-5 space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Add a visit</p>

        {/* Country picker. Tap to open the searchable scrollable list. */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen(o => !o)}
            className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {addIso2
              ? <span className="inline-flex items-center gap-2"><CountryFlag iso2={addIso2} country={addCountryName} ariaHidden size="sm" />{addCountryName}</span>
              : <span className="text-gray-500">Choose a country…</span>}
          </button>
          {pickerOpen && (
            <div className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="sticky top-0 p-2 bg-white border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Type to search…"
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-500 italic">No countries match &quot;{query}&quot;.</p>
              ) : (
                <ul>
                  {filtered.map(c => (
                    <li key={c.iso2}>
                      <button
                        type="button"
                        onClick={() => { setAddIso2(c.iso2); setQuery(''); setPickerOpen(false) }}
                        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-brand-50 text-sm"
                      >
                        <CountryFlag iso2={c.iso2} country={c.name} ariaHidden size="sm" />
                        <span>{c.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            type="date"
            value={addDate}
            max={today()}
            onChange={e => setAddDate(e.target.value)}
            required
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button
            type="submit"
            disabled={adding || !addIso2 || !addDate}
            className="btn-primary !py-2 !px-3 !text-sm disabled:opacity-60"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">{error}</p>
      )}
    </section>
  )
}

// Today's date in YYYY-MM-DD, in the user's local timezone — what a
// <input type="date"> expects.
function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
