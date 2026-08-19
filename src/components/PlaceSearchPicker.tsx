'use client'

// Standalone Google Places search box, reusable anywhere a specific
// place needs to be looked up and turned into a stable, matchable
// link (a place_id-based Google Maps URL) rather than a free-typed
// name. Used by the blog admin's Links editor so a post's location
// can carry the same identifier as a member's Recommendations entry,
// letting them be matched by ID instead of by fuzzy name text — see
// lib/recommendation-blog-links.ts.
//
// Deliberately separate from RecommendationForm's own inline search
// box rather than a shared extraction, that one is entangled with the
// rest of the add-a-place form's state, this one is a self-contained
// dropdown with a single onSelect callback.

import { useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { autocompletePlaces, googleMapsUrlFromPlaceId, newSessionToken, type PlaceSuggestion } from '@/lib/google-places'

export type PlaceSearchResult = { placeId: string; name: string; mapsUrl: string }

export default function PlaceSearchPicker({
  placeholder = 'Search Google Maps…',
  onSelect,
}: {
  placeholder?: string
  onSelect: (result: PlaceSearchResult) => void
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const sessionToken = useRef(newSessionToken())

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) { setSuggestions([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        setSuggestions(await autocompletePlaces(q, sessionToken.current))
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const select = (s: PlaceSuggestion) => {
    onSelect({ placeId: s.placeId, name: s.mainText, mapsUrl: googleMapsUrlFromPlaceId(s.placeId) })
    setQuery('')
    setSuggestions([])
    sessionToken.current = newSessionToken()
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {query.trim().length >= 3 && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {searching ? (
            <p className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…</p>
          ) : suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 italic">No matches.</p>
          ) : (
            <ul>
              {suggestions.map(s => (
                <li key={s.placeId}>
                  <button
                    type="button"
                    onClick={() => select(s)}
                    className="w-full px-3 py-2 text-left hover:bg-brand-50 text-sm"
                  >
                    <span className="font-semibold text-gray-900 block truncate">{s.mainText}</span>
                    {s.secondaryText && <span className="text-gray-400 text-xs block truncate">{s.secondaryText}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
