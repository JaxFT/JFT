'use client'

// Throttled bulk-resolve tool: auto-searches each recommendation
// missing a Google Maps link (place name + town as the query) and
// shows the top matches to confirm, one click each — much faster than
// re-running the add-place search 195 times by hand, but still a
// human picking the right result, not a blind auto-attach.
//
// Throttled to ~1 search/second, comfortably under the 60/minute
// Autocomplete quota set up for this project (see conversation about
// the Google Places spend caps).

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, MapPin, SkipForward } from 'lucide-react'
import { autocompletePlaces, googleMapsUrlFromPlaceId, newSessionToken, type PlaceSuggestion } from '@/lib/google-places'
import PlaceSearchPicker from '@/components/PlaceSearchPicker'
import { getCountryByIso2 } from '@/lib/countries'

export type ResolveRow = {
  id: string
  category: 'food' | 'attraction'
  place_name: string
  iso2: string
  town: string
  date_visited: string | null
  rating: number
  note: string | null
  google_maps_url: string | null
}

type RowState = {
  status: 'pending' | 'searching' | 'suggested' | 'resolved' | 'skipped' | 'manual'
  suggestions: PlaceSuggestion[]
  resolvedLabel?: string
}

export default function ResolveList({ initialItems }: { initialItems: ResolveRow[] }) {
  const [items, setItems] = useState(initialItems)
  const [rowState, setRowState] = useState<Record<string, RowState>>(
    Object.fromEntries(initialItems.map(i => [i.id, { status: 'pending', suggestions: [] }])),
  )
  const [running, setRunning] = useState(false)
  const stopRef = useRef(false)

  useEffect(() => () => { stopRef.current = true }, [])

  const remaining = items.filter(i => rowState[i.id]?.status === 'pending')

  const start = async () => {
    setRunning(true)
    stopRef.current = false
    for (const item of items) {
      if (stopRef.current) break
      if (rowState[item.id]?.status !== 'pending') continue
      setRowState(prev => ({ ...prev, [item.id]: { ...prev[item.id], status: 'searching' } }))
      const country = getCountryByIso2(item.iso2)
      const query = `${item.place_name}, ${item.town}${country ? ', ' + country.name : ''}`
      const results = await autocompletePlaces(query, newSessionToken())
      setRowState(prev => ({ ...prev, [item.id]: { status: 'suggested', suggestions: results.slice(0, 3) } }))
      await new Promise(res => setTimeout(res, 1100))
    }
    setRunning(false)
  }

  const stop = () => { stopRef.current = true; setRunning(false) }

  const applyLink = async (item: ResolveRow, url: string, label: string) => {
    setRowState(prev => ({ ...prev, [item.id]: { status: 'searching', suggestions: [] } }))
    const res = await fetch('/api/recommendations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        category: item.category,
        place_name: item.place_name,
        iso2: item.iso2,
        town: item.town,
        google_maps_url: url,
        date_visited: item.date_visited ?? '',
        rating: item.rating,
        note: item.note ?? '',
      }),
    })
    if (res.ok) {
      setRowState(prev => ({ ...prev, [item.id]: { status: 'resolved', suggestions: [], resolvedLabel: label } }))
    } else {
      setRowState(prev => ({ ...prev, [item.id]: { status: 'suggested', suggestions: prev[item.id]?.suggestions ?? [] } }))
    }
  }

  const skip = (id: string) => {
    setRowState(prev => ({ ...prev, [id]: { status: 'skipped', suggestions: [] } }))
  }

  const pendingCount = items.filter(i => !['resolved', 'skipped'].includes(rowState[i.id]?.status)).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {running ? (
          <button type="button" onClick={stop} className="btn-outline !py-2 !px-4 !text-sm">
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={remaining.length === 0}
            className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            Start ({remaining.length} left)
          </button>
        )}
        <p className="text-sm text-gray-500">{pendingCount} remaining · {items.length - pendingCount} done</p>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const state = rowState[item.id]
          const country = getCountryByIso2(item.iso2)
          if (state?.status === 'resolved') {
            return (
              <div key={item.id} className="flex items-center gap-3 bg-brand-50 border border-brand-100 rounded-lg px-4 py-2.5">
                <Check className="w-4 h-4 text-brand-600 shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{item.place_name}</span> → linked to {state.resolvedLabel}
                </p>
              </div>
            )
          }
          if (state?.status === 'skipped') {
            return (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 opacity-60">
                <SkipForward className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-500">{item.place_name} — skipped</p>
              </div>
            )
          }
          return (
            <div key={item.id} className="bg-white border border-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.place_name}</p>
                  <p className="text-xs text-gray-500">{item.town}, {country?.name ?? item.iso2.toUpperCase()}</p>
                </div>
                <button type="button" onClick={() => skip(item.id)} className="text-xs font-semibold text-gray-400 hover:text-gray-700 shrink-0">
                  Skip
                </button>
              </div>

              {state?.status === 'searching' && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-2"><Loader2 className="w-3 h-3 animate-spin" /> Searching…</p>
              )}

              {state?.status === 'suggested' && (
                <div className="mt-2 space-y-1.5">
                  {state.suggestions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No matches, search manually below.</p>
                  ) : (
                    state.suggestions.map(s => (
                      <button
                        key={s.placeId}
                        type="button"
                        onClick={() => applyLink(item, googleMapsUrlFromPlaceId(s.placeId), s.mainText)}
                        className="w-full text-left px-3 py-1.5 rounded-md border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-sm"
                      >
                        <span className="font-semibold text-gray-800">{s.mainText}</span>
                        {s.secondaryText && <span className="text-gray-400 text-xs block">{s.secondaryText}</span>}
                      </button>
                    ))
                  )}
                  <div className="pt-1">
                    <PlaceSearchPicker
                      placeholder="Or search manually…"
                      onSelect={r => applyLink(item, r.mapsUrl, r.name)}
                    />
                  </div>
                </div>
              )}

              {(!state || state.status === 'pending') && (
                <div className="mt-2">
                  <PlaceSearchPicker
                    placeholder="Search manually…"
                    onSelect={r => applyLink(item, r.mapsUrl, r.name)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
