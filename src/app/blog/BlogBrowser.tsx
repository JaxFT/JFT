'use client'

// Filter UI for /blog. Three structured dropdowns (Travel stage,
// Destination, Topic) + free-text search across title/excerpt/tags.
// Replaces the previous "every tag is a pill" filter strip.
//
// The dropdowns are URL-state-driven (?stage= ?destination= ?topic=
// ?q=) so a filtered view is shareable and back-button-friendly.

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X, Crown } from 'lucide-react'
import BlogCard from '@/components/blog/BlogCard'
import ShareButton from '@/components/blog/ShareButton'
import type { BlogPostView } from '@/lib/blog-db'
import { proxyImageUrl } from '@/lib/image-proxy'
import {
  TRAVEL_STAGES, BLOG_TOPICS,
  TRAVEL_STAGE_LABEL, BLOG_TOPIC_LABEL,
  type TravelStage, type BlogTopic,
} from '@/lib/blog-meta'
import { PACK_META, getPackMeta, getPackByIso2 } from '@/lib/adventurePackMeta'
import { CONTINENT_ORDER, type Continent } from '@/lib/adventurePackTypes'

const DESTINATION_GENERAL = '__none'

// Normalise a country value (which may be a pack slug like "nepal" or
// an ISO2 like "np", or null) to a canonical pack slug so it compares
// cleanly against the destination dropdown value (always a pack slug).
// Without this, guides stored with ISO2 codes never matched the
// destination filter.
function toPackSlug(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (!v) return null
  return (getPackMeta(v) ?? getPackByIso2(v))?.slug ?? null
}

type Counts = Record<string, { likes: number; comments: number }>

// A guide rendered as a card on /blog. Same visual treatment as a
// blog card, but the link goes to /guides/[slug] and there are no
// likes/comments. Only shown to premium viewers (loaded server-side).
export type GuideCardItem = {
  slug: string
  title: string
  excerpt: string
  coverImage: string
  tags: string[]
  date: string         // ISO date, used for sort
  country: string | null
}

export default function BlogBrowser({
  posts,
  counts = {},
  guides = [],
  viewerIsPremium = false,
  isAdmin = false,
}: {
  posts: BlogPostView[]
  counts?: Counts
  guides?: GuideCardItem[]
  // True if the current viewer has a premium subscription. Used to
  // decide whether to show the "Show premium only" filter chip — that
  // chip is a useful preview for non-premium visitors but pointless
  // for premium viewers who already see everything.
  viewerIsPremium?: boolean
  // Admins get an extra Premium/Free toggle to sanity-check what
  // each visitor type sees. Non-admins don't see the chip.
  isAdmin?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const stage = searchParams.get('stage') as TravelStage | null
  const destination = searchParams.get('destination')
  const topic = searchParams.get('topic') as BlogTopic | null
  const q = searchParams.get('q') ?? ''
  // Admin-only tier toggle. 'premium' shows premium-gated posts;
  // 'free' shows posts without the gate. Empty = both.
  const tier = (searchParams.get('tier') as 'premium' | 'free' | null) ?? null

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
        const postSlug = toPackSlug(p.destinationCountry)
        if (destination === DESTINATION_GENERAL) {
          if (postSlug) return false
        } else {
          if (postSlug !== destination) return false
        }
      }
      if (topic && !p.topics.includes(topic)) return false
      if (tier === 'premium' && !p.isPremium) return false
      if (tier === 'free' && p.isPremium) return false
      if (term) {
        const hay = `${p.title} ${p.excerpt} ${p.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [posts, stage, destination, topic, q, tier])

  // Guides only carry tags + a country, not the structured stage /
  // topic metadata blog posts have. So a stage or topic filter hides
  // every guide; a destination filter keeps only matching countries;
  // a free-text search hits title / excerpt / tags as you'd expect.
  const filteredGuides = useMemo(() => {
    const term = q.trim().toLowerCase()
    // Guides are premium-only content, so the admin "free" filter
    // hides every guide; "premium" keeps them.
    if (tier === 'free') return []
    return guides.filter(g => {
      if (stage) return false
      if (topic) return false
      if (destination) {
        const guideSlug = toPackSlug(g.country)
        if (destination === DESTINATION_GENERAL) {
          if (guideSlug) return false
        } else {
          if (guideSlug !== destination) return false
        }
      }
      if (term) {
        const hay = `${g.title} ${g.excerpt} ${g.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [guides, stage, destination, topic, q, tier])

  // Combined feed sorted newest-first regardless of filter state so
  // the default view (no filters) always leads with the most recent
  // post or guide.
  const combinedFeed = useMemo(() => {
    type Item =
      | { kind: 'post'; date: string; post: BlogPostView }
      | { kind: 'guide'; date: string; guide: GuideCardItem }
    const items: Item[] = [
      ...filteredPosts.map(p => ({ kind: 'post' as const, date: p.date, post: p })),
      ...filteredGuides.map(g => ({ kind: 'guide' as const, date: g.date, guide: g })),
    ]
    items.sort((a, b) => (a.date < b.date ? 1 : -1))
    return items
  }, [filteredPosts, filteredGuides])

  const livePacks = useMemo(() => PACK_META.filter(p => p.status === 'live'), [])

  // What filter values actually have at least one post behind them?
  // We hide everything else from the dropdowns so the writer doesn't
  // see options that would return an empty list. As content grows
  // the options re-appear automatically.
  const usedStages = useMemo(() => {
    const set = new Set<TravelStage>()
    for (const p of posts) for (const s of p.travelStages) set.add(s)
    return set
  }, [posts])

  const usedTopics = useMemo(() => {
    const set = new Set<BlogTopic>()
    for (const p of posts) for (const t of p.topics) set.add(t)
    return set
  }, [posts])

  const usedDestinations = useMemo(() => {
    const set = new Set<string>()           // either DESTINATION_GENERAL or a pack slug
    let hasGeneral = false
    for (const p of posts) {
      const slug = toPackSlug(p.destinationCountry)
      if (slug) set.add(slug)
      else hasGeneral = true
    }
    // Guides count toward the dropdown too — otherwise a country that
    // only has a guide (no blog post) wouldn't be selectable.
    for (const g of guides) {
      const slug = toPackSlug(g.country)
      if (slug) set.add(slug)
    }
    if (hasGeneral) set.add(DESTINATION_GENERAL)
    return set
  }, [posts, guides])

  const groupedDestinations = useMemo(() => {
    const byContinent = new Map<Continent, typeof livePacks>()
    for (const c of CONTINENT_ORDER) byContinent.set(c, [])
    for (const p of livePacks) {
      if (!usedDestinations.has(p.slug)) continue
      byContinent.get(p.continent)?.push(p)
    }
    for (const list of byContinent.values()) {
      list.sort((a, b) => a.country.localeCompare(b.country))
    }
    return CONTINENT_ORDER
      .map(c => ({ continent: c, packs: byContinent.get(c) ?? [] }))
      .filter(g => g.packs.length > 0)
  }, [livePacks, usedDestinations])

  const destinationLabel = (() => {
    if (!destination) return 'All destinations'
    if (destination === DESTINATION_GENERAL) return 'No specific destination'
    const meta = livePacks.find(p => p.slug === destination)
    return meta?.country ?? destination
  })()

  const hasAnyFilter = Boolean(stage || destination || topic || q.trim() || tier)

  // Live tally of what the current filters leave on screen. Always
  // visible above the filter bar so a reader can see "30 blogs and 6
  // guides" with no filters, then watch the numbers shrink as they
  // narrow down. Singular/plural handled because "1 blogs" reads off.
  const blogWord = filteredPosts.length === 1 ? 'blog' : 'blogs'
  const guideWord = filteredGuides.length === 1 ? 'guide' : 'guides'

  return (
    <div>
      {/* LIVE COUNT — updates as filters change. */}
      <p className="text-sm text-gray-500 mb-3">
        <strong className="text-gray-700">{filteredPosts.length}</strong> {blogWord}
        {' '}and{' '}
        <strong className="text-gray-700">{filteredGuides.length}</strong> {guideWord}
      </p>

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

        {/* Stage — only stages used by at least one post show up,
            plus the currently-selected one (so a deep link to a stage
            that no longer has posts still renders sanely). */}
        {(usedStages.size > 0 || stage) && (
          <select
            value={stage ?? ''}
            onChange={e => setParam('stage', e.target.value || null)}
            className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="">All stages</option>
            {TRAVEL_STAGES
              .filter(s => usedStages.has(s.value) || s.value === stage)
              .map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
          </select>
        )}

        {/* Destination — only countries used by at least one post,
            plus "No specific destination" if any post is missing a
            country. Same currently-selected-survives rule. */}
        {(usedDestinations.size > 0 || destination) && (
          <select
            value={destination ?? ''}
            onChange={e => setParam('destination', e.target.value || null)}
            className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 max-w-full"
          >
            <option value="">All destinations</option>
            {(usedDestinations.has(DESTINATION_GENERAL) || destination === DESTINATION_GENERAL) && (
              <option value={DESTINATION_GENERAL}>No specific destination</option>
            )}
            {groupedDestinations.map(({ continent, packs }) => (
              <optgroup key={continent} label={continent}>
                {packs.map(p => (
                  <option key={p.slug} value={p.slug}>{p.country}</option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        {/* Topic — same rule. */}
        {(usedTopics.size > 0 || topic) && (
          <select
            value={topic ?? ''}
            onChange={e => setParam('topic', e.target.value || null)}
            className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="">All topics</option>
            {BLOG_TOPICS
              .filter(t => usedTopics.has(t.value) || t.value === topic)
              .map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
          </select>
        )}

        {/* Non-premium viewers get a "Show premium only" chip so they
            can browse exactly what they'd unlock by upgrading. Hidden
            for premium viewers (they have access to everything, so the
            chip would just be confusing). Admins always see both this
            and the Premium/Free pair below. */}
        {!viewerIsPremium && (
          <button
            type="button"
            onClick={() => setParam('tier', tier === 'premium' ? null : 'premium')}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition-colors ${
              tier === 'premium'
                ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
            aria-pressed={tier === 'premium'}
            title="Filter to show only premium posts and guides"
          >
            <Crown className="w-3.5 h-3.5" />
            {tier === 'premium' ? 'Showing premium only' : 'Show premium only'}
          </button>
        )}

        {/* Admin-only Premium/Free toggle. Lets the writer sanity-
            check what each visitor tier sees without logging out. */}
        {isAdmin && (
          <div className="inline-flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setParam('tier', tier === 'premium' ? null : 'premium')}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded ${tier === 'premium' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              aria-pressed={tier === 'premium'}
              title="Show only premium posts and guides"
            >
              <Crown className="w-3 h-3 inline -mt-0.5 mr-1" /> Premium
            </button>
            <button
              type="button"
              onClick={() => setParam('tier', tier === 'free' ? null : 'free')}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded ${tier === 'free' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              aria-pressed={tier === 'free'}
              title="Show only free posts (hides every guide)"
            >
              Free
            </button>
          </div>
        )}

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

      {/* ACTIVE FILTER LABELS — context for the live count above. */}
      {hasAnyFilter && (stage || destination || topic || q.trim()) && (
        <p className="text-sm text-gray-500 mb-5">
          Filtered by
          {stage && <> stage <strong className="text-gray-700">{TRAVEL_STAGE_LABEL[stage]}</strong></>}
          {destination && <>{stage ? ' ·' : ''} destination <strong className="text-gray-700">{destinationLabel}</strong></>}
          {topic && <>{stage || destination ? ' ·' : ''} topic <strong className="text-gray-700">{BLOG_TOPIC_LABEL[topic]}</strong></>}
          {q.trim() && <>{stage || destination || topic ? ' ·' : ''} matching <strong className="text-gray-700">&ldquo;{q.trim()}&rdquo;</strong></>}
        </p>
      )}

      {/* COMBINED FEED — posts and (for premium viewers) published
          web guides, sorted newest-first. */}
      {combinedFeed.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No posts match those filters yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {combinedFeed.map(item =>
            item.kind === 'post'
              ? <BlogCard key={`p-${item.post.slug}`} post={item.post} counts={counts[item.post.slug]} />
              : <GuideCard key={`g-${item.guide.slug}`} guide={item.guide} />,
          )}
        </div>
      )}
    </div>
  )
}

// Card for a published web guide on /blog. Same visual rhythm as
// BlogCard but routes to /guides/[slug], shows a "Guide" badge,
// and includes a share button. No likes/comments — guides don't
// have those interactions.
function GuideCard({ guide }: { guide: GuideCardItem }) {
  return (
    <a
      href={`/guides/${guide.slug}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
    >
      {guide.coverImage && (
        <div className="overflow-hidden h-48">
          <img
            src={proxyImageUrl(guide.coverImage)}
            alt={guide.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="flex flex-col flex-1 p-5">
        {(() => {
          // Same shape as BlogCard chips: place first (flag + country),
          // then up to two of the guide's free-form tags (guides don't
          // carry the structured topics enum, so we use tags here).
          const country = guide.country
            ? (getPackMeta(guide.country.toLowerCase()) ?? getPackByIso2(guide.country.toLowerCase()))
            : null
          const tagChips = guide.tags.slice(0, 2)
          if (!country && tagChips.length === 0) return null
          return (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {country && (
                <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span aria-hidden>{country.flag}</span>
                  {country.country}
                </span>
              )}
              {tagChips.map(tag => (
                <span key={tag} className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )
        })()}
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
          {guide.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3">{guide.excerpt}</p>
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-400">
              {new Date(guide.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                Guide
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3" /> Premium
              </span>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <ShareButton
              url={`/guides/${guide.slug}`}
              title={guide.title}
              text={guide.excerpt || undefined}
            />
          </div>
        </div>
      </div>
    </a>
  )
}
