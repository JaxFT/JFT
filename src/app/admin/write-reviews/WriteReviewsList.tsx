'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, Star } from 'lucide-react'
import { extractPlaceId } from '@/lib/google-places'
import { getCountryByIso2 } from '@/lib/countries'

export type WriteReviewRow = {
  id: string
  category: 'food' | 'attraction'
  place_name: string
  iso2: string
  town: string
  rating: number
  note: string | null
  google_maps_url: string | null
  google_review_posted_at: string | null
}

export default function WriteReviewsList({ initialItems }: { initialItems: WriteReviewRow[] }) {
  const [items, setItems] = useState(initialItems)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const toggleDone = async (id: string, currentlyDone: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, google_review_posted_at: currentlyDone ? null : new Date().toISOString() } : i))
    const res = await fetch(`/api/recommendations/${id}/google-review-posted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posted: !currentlyDone }),
    })
    if (!res.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, google_review_posted_at: currentlyDone ? new Date().toISOString() : null } : i))
    }
  }

  const copyNote = async (item: WriteReviewRow) => {
    if (!item.note) return
    try {
      await navigator.clipboard.writeText(item.note)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch { /* clipboard unavailable, ignore */ }
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-16">No recommendations with a Maps link yet.</p>
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const country = getCountryByIso2(item.iso2)
        const placeId = extractPlaceId(item.google_maps_url)
        const reviewUrl = placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}` : null
        const done = !!item.google_review_posted_at
        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 bg-white border rounded-lg px-4 py-3 ${done ? 'border-brand-200 bg-brand-50/40' : 'border-gray-100'}`}
          >
            <button
              type="button"
              onClick={() => toggleDone(item.id, done)}
              className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${done ? 'bg-brand-600 border-brand-600' : 'border-gray-300 hover:border-brand-400'}`}
              aria-label={done ? 'Mark not posted' : 'Mark posted'}
            >
              {done && <Check className="w-3 h-3 text-white" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className={`font-semibold text-sm ${done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{item.place_name}</p>
                <div className="flex items-center shrink-0">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`w-3 h-3 ${n <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">{item.town}, {country?.name ?? item.iso2.toUpperCase()}</p>
              {item.note && <p className="text-sm text-gray-600 mt-1">{item.note}</p>}

              <div className="flex items-center gap-3 mt-2">
                {reviewUrl && (
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                  >
                    Write on Google <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {item.note && (
                  <button
                    type="button"
                    onClick={() => copyNote(item)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    {copiedId === item.id ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy note</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
