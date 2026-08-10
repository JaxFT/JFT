'use client'

// Been / Want-to-go lists, plus Top 8 ranking on "been" rows. Same
// country-picker UX as CountryVisitsSection on /family, minus the
// visit date (a Travel Profile place isn't tied to a specific trip).

import { useMemo, useState } from 'react'
import { Loader2, MapPin, Plus, Search, Sparkles, X } from 'lucide-react'
import { COUNTRIES, getCountryByIso2 } from '@/lib/countries'
import CountryFlag from '@/components/CountryFlag'

export type PlaceRow = { id: string; iso2: string; list_type: 'been' | 'want'; top8_rank: number | null }

export default function PlacesEditor({
  initialPlaces,
  hasPassportVisits,
}: {
  initialPlaces: PlaceRow[]
  hasPassportVisits: boolean
}) {
  const [places, setPlaces] = useState<PlaceRow[]>(initialPlaces)
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [error, setError] = useState('')

  const been = places.filter(p => p.list_type === 'been')
  const want = places.filter(p => p.list_type === 'want')
  const usedRanks = new Set(been.map(p => p.top8_rank).filter((r): r is number => r != null))

  const addPlace = async (iso2: string, listType: 'been' | 'want') => {
    setError('')
    try {
      const res = await fetch('/api/travel-profile/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iso2, list_type: listType }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not add that country')
      setPlaces(prev => [...prev.filter(p => !(p.iso2 === iso2 && p.list_type === listType)), body.place])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that country')
    }
  }

  const removePlace = async (id: string) => {
    setError('')
    const prev = places
    setPlaces(p => p.filter(x => x.id !== id))
    const res = await fetch(`/api/travel-profile/places?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setPlaces(prev) // roll back
      setError('Could not remove that country')
    }
  }

  const setTop8 = async (id: string, rank: number | null) => {
    setError('')
    const prevPlaces = places
    setPlaces(list => list.map(p => {
      if (p.id === id) return { ...p, top8_rank: rank }
      if (rank !== null && p.top8_rank === rank) return { ...p, top8_rank: null }
      return p
    }))
    const res = await fetch('/api/travel-profile/places', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, rank }),
    })
    if (!res.ok) {
      setPlaces(prevPlaces)
      setError('Could not update your Travel 8')
    }
  }

  const importFromPassport = async () => {
    setImporting(true)
    setError('')
    try {
      const res = await fetch('/api/travel-profile/places/import', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Import failed')
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
      setImporting(false)
    }
    setImportDone(true)
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Places</h2>
      </div>
      <p className="text-sm text-gray-500 mb-5">Where you&apos;ve been, and where you want to go next.</p>

      {hasPassportVisits && !importDone && (
        <button
          type="button"
          onClick={importFromPassport}
          disabled={importing}
          className="w-full mb-5 flex items-center justify-center gap-2 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-lg py-2.5 disabled:opacity-60"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Import countries from your Adventure Passport
        </button>
      )}

      <PlaceList
        title="I've been"
        places={been}
        onRemove={removePlace}
        onAdd={iso2 => addPlace(iso2, 'been')}
        excludeIso2={new Set(been.map(p => p.iso2))}
        top8Control={(place) => (
          <select
            value={place.top8_rank ?? ''}
            onChange={e => setTop8(place.id, e.target.value ? Number(e.target.value) : null)}
            className="text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300"
            title="Add to My Travel 8"
          >
            <option value="">Top 8: —</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n} disabled={usedRanks.has(n) && place.top8_rank !== n}>
                #{n}
              </option>
            ))}
          </select>
        )}
      />

      <div className="mt-6">
        <PlaceList
          title="I want to go"
          places={want}
          onRemove={removePlace}
          onAdd={iso2 => addPlace(iso2, 'want')}
          excludeIso2={new Set(want.map(p => p.iso2))}
        />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">{error}</p>
      )}
    </section>
  )
}

function PlaceList({
  title, places, onRemove, onAdd, excludeIso2, top8Control,
}: {
  title: string
  places: PlaceRow[]
  onRemove: (id: string) => void
  onAdd: (iso2: string) => void
  excludeIso2: Set<string>
  top8Control?: (place: PlaceRow) => React.ReactNode
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return COUNTRIES
      .filter(c => c.continent !== 'Antarctica')
      .filter(c => !excludeIso2.has(c.iso2))
      .filter(c => !q || c.name.toLowerCase().includes(q))
  }, [query, excludeIso2])

  return (
    <div>
      <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">{title}</p>
      {places.length > 0 ? (
        <ul className="space-y-1.5 mb-3">
          {places.map(p => {
            const country = getCountryByIso2(p.iso2)
            const name = country?.name ?? p.iso2.toUpperCase()
            return (
              <li key={p.id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg">
                <CountryFlag iso2={p.iso2} country={name} ariaHidden size="sm" />
                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{name}</span>
                {top8Control?.(p)}
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  className="text-gray-400 hover:text-red-600 p-1"
                  aria-label={`Remove ${name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic mb-3">Nothing added yet.</p>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen(o => !o)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <Plus className="w-4 h-4" /> Add a country
        </button>
        {pickerOpen && (
          <div className="absolute z-20 left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
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
                      onClick={() => { onAdd(c.iso2); setQuery(''); setPickerOpen(false) }}
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
    </div>
  )
}
