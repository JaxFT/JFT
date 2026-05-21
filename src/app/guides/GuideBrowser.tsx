'use client'

// Search + grid for /guides. Mirrors the search bar on /blog so the
// two listings behave the same way, free-text match across title,
// subtitle and tags. URL-state-driven (?q=...) so filtered views are
// shareable.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Map, ArrowRight, Crown, Search, X } from 'lucide-react'
import { proxyImageUrl } from '@/lib/image-proxy'
import { formatPrice } from '@/lib/guides-db'

export type GuideCardModel = {
  slug: string
  name: string
  subtitle: string | null
  cover_image: string | null
  tags: string[]
  price_pence: number
}

type Props = {
  guides: GuideCardModel[]
  isPremium: boolean
}

export default function GuideBrowser({ guides, isPremium }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(q)

  const setQ = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) params.delete('q')
    else params.set('q', value)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return guides
    return guides.filter(g => {
      const hay = `${g.name} ${g.subtitle ?? ''} ${g.tags.join(' ')}`.toLowerCase()
      return hay.includes(term)
    })
  }, [guides, q])

  return (
    <div>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 mb-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onBlur={() => setQ(query.trim() || null)}
            onKeyDown={e => { if (e.key === 'Enter') setQ(query.trim() || null) }}
            placeholder="Search guides…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        {q.trim() && (
          <button
            type="button"
            onClick={() => { setQuery(''); router.replace(pathname, { scroll: false }) }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 px-2.5 py-2"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {q.trim() && (
        <p className="text-sm text-gray-500 mb-5">
          Showing {filtered.length} of {guides.length} guides matching <strong className="text-gray-700">&ldquo;{q.trim()}&rdquo;</strong>
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          <Map className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p>{q.trim() ? 'No guides match that search.' : 'No guides yet, check back soon.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(guide => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all aspect-[3/4] block"
            >
              {guide.cover_image ? (
                <img
                  src={proxyImageUrl(guide.cover_image)}
                  alt={guide.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-200 via-brand-300 to-brand-500 flex items-center justify-center">
                  <Map className="w-16 h-16 text-brand-800" />
                </div>
              )}

              {guide.tags.length > 0 && (
                <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 max-w-[calc(100%-2rem)]">
                  {guide.tags.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      className="text-xs font-semibold text-white bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-brand-950/85 backdrop-blur-sm text-white p-5">
                <h3 className="font-bold leading-snug mb-1 line-clamp-2">{guide.name}</h3>
                {guide.subtitle && (
                  <p className="text-sm text-white/70 leading-snug line-clamp-2 mb-3">{guide.subtitle}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/15">
                  {isPremium ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase text-brand-200">
                      <Crown className="w-3.5 h-3.5" /> Included
                    </span>
                  ) : (
                    <span className="font-bold text-base">{formatPrice(guide.price_pence)}</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-200 group-hover:gap-2 transition-all">
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
