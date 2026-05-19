'use client'

// Filter UI for /blog. Three structured dropdowns (Travel stage,
// Destination, Topic) + free-text search across title/excerpt/tags.
// Replaces the previous "every tag is a pill" filter strip.
//
// The dropdowns are URL-state-driven (?stage= ?destination= ?topic=
// ?q=) so a filtered view is shareable and back-button-friendly.

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import BlogCard from '@/components/blog/BlogCard'
import type { BlogPostView } from '@/lib/blog-db'
import {
  TRAVEL_STAGES, BLOG_TOPICS,
  TRAVEL_STAGE_LABEL, BLOG_TOPIC_LABEL,
  type TravelStage, type BlogTopic,
} from '@/lib/blog-meta'
import { PACK_META } from '@/lib/adventurePackMeta'
import { CONTINENT_ORDER, type Continent } from '@/lib/adventurePackTypes'

const DESTINATION_GENERAL = '__none'

export default function BlogBrowser({ posts }: { posts: BlogPostView[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const stage = searchParams.get('stage') as TravelStage | null
  const destination = searchParams.get('destination')
  const topic = searchParams.get('topic') as BlogTopic | null
  const q = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(q)

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === '') params.delete(key)
    else params.set(key, value)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  // Apply filters client-side. Posts list is shipped fully by the
  // server component (it's small) so we don't need to refetch on
  // filter change.
  const filteredPosts = useMemo(() => {
    const term = q.trim().toLowerCase()
    return posts.filter(p => {
      if (stage && !p.travelStages.includes(stage)) return false
      if (destination) {
        if (destination === DESTINATION_GENERAL) {
          if (p.destinationCountry) return false
        } else {
          if (p.destinationCountry !== destination) return false
        }
      }
      if (topic && !p.topics.includes(topic)) return false
      if (term) {
        const hay = `${p.title} ${p.excerpt} ${p.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [posts, stage, destination, topic, q])

  const livePacks = useMemo(() => PACK_META.filter(p => p.status === 'live'), [])
  const groupedDestinations = useMemo(() => {
    const byContinent = new Map<Continent, typeof livePacks>()
    for (const c of CONTINENT_ORDER) byContinent.set(c, [])
    for (const p of livePacks) byContinent.get(p.continent)?.push(p)
    for (const list of byContinent.values()) {
      list.sort((a, b) => a.country.localeCompare(b.country))
    }
    return CONTINENT_ORDER
      .map(c => ({ continent: c, packs: byContinent.get(c) ?? [] }))
      .filter(g => g.packs.length > 0)
  }, [livePacks])

  const destinationLabel = (() => {
    if (!destination) return 'All destinations'
    if (destination === DESTINATION_GENERAL) return 'No specific destination'
    const meta = livePacks.find(p => p.slug === destination)
    return meta?.country ?? destination
  })()

  const hasAnyFilter = Boolean(stage || destination || topic || q.trim())

  return (
    <div>
      {/* FILTER BAR */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 mb-6 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onBlur={() => setParam('q', query.trim() || null)}
            onKeyDown={e => { if (e.key === 'Enter') setParam('q', query.trim() || null) }}
            placeholder="Search posts…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {/* Stage */}
        <select
          value={stage ?? ''}
          onChange={e => setParam('stage', e.target.value || null)}
          className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">All stages</option>
          {TRAVEL_STAGES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Destination — native <select> with <optgroup> per continent
            for visual consistency with the Stage + Topic dropdowns and
            so it always fits on small screens. */}
        <select
          value={destination ?? ''}
          onChange={e => setParam('destination', e.target.value || null)}
          className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 max-w-full"
        >
          <option value="">All destinations</option>
          <option value={DESTINATION_GENERAL}>No specific destination</option>
          {groupedDestinations.map(({ continent, packs }) => (
            <optgroup key={continent} label={continent}>
              {packs.map(p => (
                <option key={p.slug} value={p.slug}>{p.country}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Topic */}
        <select
          value={topic ?? ''}
          onChange={e => setParam('topic', e.target.value || null)}
          className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">All topics</option>
          {BLOG_TOPICS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Clear-all */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              router.replace(pathname, { scroll: false })
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 px-2.5 py-2"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* ACTIVE FILTER CHIPS — read-only summary line. */}
      {hasAnyFilter && (
        <p className="text-sm text-gray-500 mb-5">
          Showing {filteredPosts.length} of {posts.length} posts
          {stage && <> · stage <strong className="text-gray-700">{TRAVEL_STAGE_LABEL[stage]}</strong></>}
          {destination && <> · destination <strong className="text-gray-700">{destinationLabel}</strong></>}
          {topic && <> · topic <strong className="text-gray-700">{BLOG_TOPIC_LABEL[topic]}</strong></>}
          {q.trim() && <> · matching <strong className="text-gray-700">&ldquo;{q.trim()}&rdquo;</strong></>}
        </p>
      )}

      {/* POSTS GRID */}
      {filteredPosts.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No posts match those filters yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map(p => <BlogCard key={p.slug} post={p} />)}
        </div>
      )}
    </div>
  )
}
