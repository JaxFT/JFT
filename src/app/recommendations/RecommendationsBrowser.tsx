'use client'

// Client-side filter (country / town / category) over a server-fetched
// list. Fine to filter in memory at the site's current scale (see the
// same reasoning on /discover) — worth moving to a real query with
// searchParams if this list ever gets big.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Plus, Search, X } from 'lucide-react'
import { COUNTRIES } from '@/lib/countries'
import RecommendationForm, { type NewRecommendationInput } from '@/components/recommendations/RecommendationForm'
import RecommendationCard from '@/components/recommendations/RecommendationCard'
import { MAX_RECOMMENDATIONS_FEATURED, type Recommendation, type RecommendationCategory } from '@/components/recommendations/types'

export default function RecommendationsBrowser({
  initialRecommendations,
  currentUserId,
  isAdmin,
  adminAuthorIds,
  authorFilter,
}: {
  initialRecommendations: Recommendation[]
  currentUserId: string | null
  isAdmin: boolean
  adminAuthorIds: string[]
  authorFilter: { id: string; name: string | null } | null
}) {
  const adminAuthorIdSet = useMemo(() => new Set(adminAuthorIds), [adminAuthorIds])
  const [recommendations, setRecommendations] = useState(initialRecommendations)
  const [category, setCategory] = useState<RecommendationCategory | 'all'>('all')
  const [iso2, setIso2] = useState('')
  const [town, setTown] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  const countriesInUse = useMemo(() => {
    const codes = new Set(recommendations.map(r => r.iso2))
    return COUNTRIES.filter(c => codes.has(c.iso2)).sort((a, b) => a.name.localeCompare(b.name))
  }, [recommendations])

  const featuredCount = useMemo(() => recommendations.filter(r => r.homepage_featured).length, [recommendations])
  const featuredCapReached = featuredCount >= MAX_RECOMMENDATIONS_FEATURED

  // A handful of places shown by default so the page reads as "here's
  // a taste of what's out there" rather than dumping the entire list.
  // Admin-pinned (homepage_featured) rows always come first, then
  // topped up with one per distinct country among the rest, then with
  // the next most recent overall if still short of 4.
  const highlights = useMemo(() => {
    const picks: Recommendation[] = recommendations.filter(r => r.homepage_featured).slice(0, MAX_RECOMMENDATIONS_FEATURED)
    const pickedIds = new Set(picks.map(r => r.id))
    const seenCountries = new Set(picks.map(r => r.iso2))
    if (picks.length < MAX_RECOMMENDATIONS_FEATURED) {
      for (const r of recommendations) {
        if (pickedIds.has(r.id) || seenCountries.has(r.iso2)) continue
        seenCountries.add(r.iso2)
        pickedIds.add(r.id)
        picks.push(r)
        if (picks.length === MAX_RECOMMENDATIONS_FEATURED) break
      }
    }
    if (picks.length < MAX_RECOMMENDATIONS_FEATURED) {
      for (const r of recommendations) {
        if (pickedIds.has(r.id)) continue
        pickedIds.add(r.id)
        picks.push(r)
        if (picks.length === MAX_RECOMMENDATIONS_FEATURED) break
      }
    }
    return picks
  }, [recommendations])

  const isSearching = category !== 'all' || iso2 !== '' || town.trim() !== ''

  const filtered = useMemo(() => {
    const t = town.trim().toLowerCase()
    return recommendations.filter(r =>
      (category === 'all' || r.category === category) &&
      (!iso2 || r.iso2 === iso2) &&
      (!t || r.town.toLowerCase().includes(t) || r.place_name.toLowerCase().includes(t)) &&
      (!authorFilter || r.user_id === authorFilter.id),
    )
  }, [recommendations, category, iso2, town, authorFilter])

  const clearSearch = () => {
    setCategory('all')
    setIso2('')
    setTown('')
    setShowAll(false)
  }

  const showFullList = isSearching || showAll

  const handleFeaturedChange = (id: string, value: boolean) => {
    setRecommendations(list => list.map(r => r.id === id ? { ...r, homepage_featured: value } : r))
  }

  const addRecommendation = async (input: NewRecommendationInput): Promise<string | void> => {
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return body.error || 'Could not add that place'
      setRecommendations(prev => [body.recommendation, ...prev])
      setAdding(false)
    } catch {
      return 'Could not add that place'
    }
  }

  const removeRecommendation = async (id: string) => {
    setError('')
    const prev = recommendations
    setRecommendations(list => list.filter(r => r.id !== id))
    const res = await fetch(`/api/recommendations?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setRecommendations(prev)
      setError('Could not remove that place')
    }
  }

  return (
    <div className="space-y-5">
      {authorFilter && (
        <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2.5">
          <p className="text-sm text-brand-800">
            Showing recommendations from <span className="font-semibold">{authorFilter.name ?? 'this member'}</span>
          </p>
          <Link href="/recommendations" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 shrink-0">
            <X className="w-3.5 h-3.5" /> Clear
          </Link>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'food', 'attraction'] as const).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border ${
                category === c
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c === 'all' ? 'All' : c === 'food' ? 'Food' : 'Places'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <select
            value={iso2}
            onChange={e => setIso2(e.target.value)}
            className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All countries</option>
            {countriesInUse.map(c => (
              <option key={c.iso2} value={c.iso2}>{c.name}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={town}
              onChange={e => setTown(e.target.value)}
              placeholder="Search by place or town…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        {isSearching && !authorFilter && (
          <button
            type="button"
            onClick={clearSearch}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700"
          >
            <X className="w-3.5 h-3.5" /> Clear search
          </button>
        )}
      </div>

      {!currentUserId ? (
        <Link
          href="/login?next=/recommendations"
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-lg py-2.5"
        >
          <Plus className="w-4 h-4" /> Sign in to add a place
        </Link>
      ) : adding ? (
        <RecommendationForm onSubmit={addRecommendation} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-lg py-2.5"
        >
          <Plus className="w-4 h-4" /> Add a place
        </button>
      )}

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}

      {recommendations.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-8">No places added yet, be the first.</p>
      ) : !authorFilter && !showFullList ? (
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">A few of our favourites from around the world</p>
          <div className="space-y-2">
            {highlights.map(r => (
              <RecommendationCard
                key={r.id}
                rec={r}
                showAuthor
                canInteract={!!currentUserId}
                canEdit={r.user_id === currentUserId || (isAdmin && adminAuthorIdSet.has(r.user_id))}
                onRemove={(r.user_id === currentUserId || isAdmin) ? removeRecommendation : undefined}
                isAdmin={isAdmin}
                featuredCapReached={featuredCapReached}
                onFeaturedChange={handleFeaturedChange}
              />
            ))}
          </div>
          {recommendations.length > highlights.length ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-gray-500 hover:text-brand-700 mt-4"
            >
              {recommendations.length - highlights.length} more from around the world <ChevronDown className="w-3.5 h-3.5" />
            </button>
          ) : (
            <p className="text-xs text-gray-400 text-center mt-4">Search above to explore more of what our community has found.</p>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-8">Nothing matches those filters.</p>
      ) : (
        <div>
          <div className="space-y-2">
            {filtered.map(r => (
              <RecommendationCard
                key={r.id}
                rec={r}
                showAuthor
                canInteract={!!currentUserId}
                canEdit={r.user_id === currentUserId || (isAdmin && adminAuthorIdSet.has(r.user_id))}
                onRemove={(r.user_id === currentUserId || isAdmin) ? removeRecommendation : undefined}
                isAdmin={isAdmin}
                featuredCapReached={featuredCapReached}
                onFeaturedChange={handleFeaturedChange}
              />
            ))}
          </div>
          {showAll && !isSearching && !authorFilter && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-gray-500 hover:text-brand-700 mt-4"
            >
              Show fewer <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
