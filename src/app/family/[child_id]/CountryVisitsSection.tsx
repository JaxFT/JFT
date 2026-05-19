'use client'

// Lets a parent edit, add or remove country visits for a child. The
// "first_visit_date" is the moment that country lights up on the map
// — useful for families who want to retroactively log trips taken
// before they started using JFT.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Plus, X, Loader2, Calendar } from 'lucide-react'

type PackMetaLite = {
  slug: string
  country: string
  flag: string
}

type VisitRow = {
  country_slug: string
  first_visit_date: string // YYYY-MM-DD
}

export default function CountryVisitsSection({
  childId,
  initialVisits,
  allPacks,
}: {
  childId: string
  initialVisits: VisitRow[]
  allPacks: PackMetaLite[]
}) {
  const router = useRouter()
  const [visits, setVisits] = useState<VisitRow[]>(initialVisits)
  const [busy, setBusy] = useState<string | null>(null) // country_slug being mutated
  const [error, setError] = useState<string | null>(null)

  // Form state for adding a new visit.
  const [addSlug, setAddSlug] = useState<string>('')
  const [addDate, setAddDate] = useState<string>(today())
  const [adding, setAdding] = useState(false)

  // Quick lookup for pack metadata by slug.
  const packBySlug = useMemo(() => {
    const m = new Map<string, PackMetaLite>()
    for (const p of allPacks) m.set(p.slug, p)
    return m
  }, [allPacks])

  // Packs the child hasn't visited yet (available to add).
  const availablePacks = useMemo(
    () => allPacks.filter(p => !visits.some(v => v.country_slug === p.slug)),
    [allPacks, visits],
  )

  const updateDate = async (slug: string, newDate: string) => {
    setBusy(slug)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/visits/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_visit_date: newDate }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setVisits(prev => prev.map(v => v.country_slug === slug ? { ...v, first_visit_date: newDate } : v))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update date')
    } finally {
      setBusy(null)
    }
  }

  const removeVisit = async (slug: string) => {
    setBusy(slug)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/visits/${slug}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setVisits(prev => prev.filter(v => v.country_slug !== slug))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove visit')
    } finally {
      setBusy(null)
    }
  }

  const addVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addSlug || !addDate) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_slug: addSlug, first_visit_date: addDate }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setVisits(prev => [{ country_slug: addSlug, first_visit_date: addDate }, ...prev])
      setAddSlug('')
      setAddDate(today())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add visit')
    } finally {
      setAdding(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Country visits</h2>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        The date the country lights up on the map. We auto-add a visit the first time the kid opens a pack, but you
        can backdate trips you took before you started using JFT.
      </p>

      {/* Existing visits */}
      {visits.length > 0 ? (
        <ul className="space-y-2 mb-5">
          {visits.map(v => {
            const meta = packBySlug.get(v.country_slug)
            if (!meta) return null
            const isBusy = busy === v.country_slug
            return (
              <li
                key={v.country_slug}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-2xl leading-none" aria-hidden>{meta.flag}</span>
                <p className="font-semibold text-gray-900 flex-1 min-w-0 truncate">{meta.country}</p>
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <input
                    type="date"
                    value={v.first_visit_date}
                    max={today()}
                    disabled={isBusy}
                    onChange={e => {
                      const newDate = e.target.value
                      if (newDate && newDate !== v.first_visit_date) updateDate(v.country_slug, newDate)
                    }}
                    className="text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeVisit(v.country_slug)}
                  disabled={isBusy}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-50 p-1"
                  aria-label={`Remove ${meta.country} visit`}
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
      {availablePacks.length > 0 && (
        <form onSubmit={addVisit} className="border-t border-gray-100 pt-5">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">Add a visit</p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
            <select
              value={addSlug}
              onChange={e => setAddSlug(e.target.value)}
              required
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="" disabled>Choose a country…</option>
              {availablePacks.map(p => (
                <option key={p.slug} value={p.slug}>
                  {p.flag} {p.country}
                </option>
              ))}
            </select>
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
              disabled={adding || !addSlug || !addDate}
              className="btn-primary !py-2 !px-3 !text-sm disabled:opacity-60"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </form>
      )}

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
