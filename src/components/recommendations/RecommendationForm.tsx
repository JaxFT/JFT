'use client'

// Add-a-place form, shared by /recommendations and the Travel Profile
// favourites sections. `lockCategory` hides the food/attraction toggle
// for the profile sections, where it's implied by which section you're
// adding from.
//
// Google Maps search is optional — someone can skip it and just type a
// name, country, town by hand. When they do search and pick a result,
// it prefills the name, country and town, and stores a maps link
// built from the returned place_id.

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, Search, Star, X } from 'lucide-react'
import { COUNTRIES } from '@/lib/countries'
import { autocompletePlaces, getPlaceAddress, googleMapsUrlFromPlaceId, newSessionToken, type PlaceSuggestion } from '@/lib/google-places'
import type { RecommendationCategory } from './types'

export type NewRecommendationInput = {
  category: RecommendationCategory
  place_name: string
  iso2: string
  town: string
  google_maps_url: string
  date_visited: string
  rating: number
  note: string
}

export default function RecommendationForm({
  lockCategory,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  lockCategory?: RecommendationCategory
  initialValues?: NewRecommendationInput
  submitLabel?: string
  onSubmit: (input: NewRecommendationInput) => Promise<string | void>
  onCancel: () => void
}) {
  const [category, setCategory] = useState<RecommendationCategory>(initialValues?.category ?? lockCategory ?? 'food')
  const [placeName, setPlaceName] = useState(initialValues?.place_name ?? '')
  const [iso2, setIso2] = useState(initialValues?.iso2 ?? '')
  const [town, setTown] = useState(initialValues?.town ?? '')
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialValues?.google_maps_url ?? '')
  const [linkedPlaceName, setLinkedPlaceName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const sessionToken = useRef(newSessionToken())
  const [dateVisited, setDateVisited] = useState(initialValues?.date_visited ?? '')
  const [rating, setRating] = useState(initialValues?.rating ?? 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [note, setNote] = useState(initialValues?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [addressLoading, setAddressLoading] = useState(false)

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 3) { setSuggestions([]); setSearching(false); setSearchError(false); return }
    setSearching(true)
    setSearchError(false)
    const t = setTimeout(async () => {
      try {
        const results = await autocompletePlaces(q, sessionToken.current)
        setSuggestions(results)
      } catch (e) {
        console.error('Places autocomplete failed', e)
        setSuggestions([])
        setSearchError(true)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const selectPlace = async (s: PlaceSuggestion) => {
    setGoogleMapsUrl(googleMapsUrlFromPlaceId(s.placeId))
    setLinkedPlaceName(s.mainText)
    if (!placeName.trim()) setPlaceName(s.mainText.slice(0, 120))
    setSearchQuery('')
    setSuggestions([])

    setAddressLoading(true)
    const address = await getPlaceAddress(s.placeId, sessionToken.current)
    setAddressLoading(false)
    if (address.iso2 && COUNTRIES.some(c => c.iso2 === address.iso2)) setIso2(address.iso2)
    if (address.town) setTown(address.town.slice(0, 80))

    sessionToken.current = newSessionToken()
  }

  const clearPlace = () => {
    setGoogleMapsUrl('')
    setLinkedPlaceName('')
  }

  const submit = async () => {
    setError('')
    if (!placeName.trim() || !iso2 || !town.trim() || rating < 1) {
      setError('Place name, country, town and a rating are required')
      return
    }
    setBusy(true)
    const err = await onSubmit({
      category, place_name: placeName.trim(), iso2, town: town.trim(),
      google_maps_url: googleMapsUrl.trim(), date_visited: dateVisited, rating, note: note.trim(),
    })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
      {!lockCategory && (
        <div className="flex gap-2">
          {(['food', 'attraction'] as const).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
                category === c
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {c === 'food' ? 'Food' : 'Attraction'}
            </button>
          ))}
        </div>
      )}

      {googleMapsUrl ? (
        <div className="flex items-center gap-2 px-3.5 py-2.5 border border-brand-200 bg-brand-50 rounded-lg text-sm">
          <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
          <span className="flex-1 truncate text-brand-800 font-medium">{linkedPlaceName || 'Linked on Google Maps'}</span>
          <button type="button" onClick={clearPlace} className="text-brand-600 hover:text-red-600 shrink-0" aria-label="Remove Google Maps link">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Google Maps to fill this in (optional)…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {searchQuery.trim().length >= 3 && (
            <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
              {searching ? (
                <p className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…</p>
              ) : searchError ? (
                <p className="px-4 py-3 text-sm text-red-500">Search is temporarily unavailable, you can still type the name below.</p>
              ) : suggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500 italic">No matches, you can still type the name below.</p>
              ) : (
                <ul>
                  {suggestions.map(s => (
                    <li key={s.placeId}>
                      <button
                        type="button"
                        onClick={() => selectPlace(s)}
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
      )}

      <input
        type="text"
        value={placeName}
        onChange={e => setPlaceName(e.target.value.slice(0, 120))}
        placeholder={category === 'food' ? 'Restaurant name' : 'Attraction name'}
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      {addressLoading && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Filling in country and town…</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={iso2}
          onChange={e => setIso2(e.target.value)}
          className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Country…</option>
          {COUNTRIES.filter(c => c.continent !== 'Antarctica').map(c => (
            <option key={c.iso2} value={c.iso2}>{c.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={town}
          onChange={e => setTown(e.target.value.slice(0, 80))}
          placeholder="Town / city"
          className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
        <input
          type="date"
          value={dateVisited}
          onChange={e => setDateVisited(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              className="p-0.5"
            >
              <Star
                className={`w-6 h-6 ${
                  n <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value.slice(0, 500))}
        rows={2}
        placeholder="A quick note (optional)"
        spellCheck
        lang="en"
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitLabel ?? 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700 px-3"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  )
}
