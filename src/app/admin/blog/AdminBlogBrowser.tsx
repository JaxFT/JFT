'use client'

// Client-side filter UI and list rendering for /admin/blog. Server
// hands us the full posts array + per-slug social counts; we layer
// search, status, and premium filters on top with URL state so the
// view is shareable / refresh-safe.
//
// Mobile layout: each row stacks the title + meta on top and the
// action buttons (Pin / View / Edit) below as a horizontal scroller-
// safe row, so phones don't squash the controls down the side of the
// card.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X, Eye, Heart, MessageCircle, ExternalLink, Crown, Pin, FileText, Plus } from 'lucide-react'
import HomepagePinButton from './HomepagePinButton'
import type { BlogPostRow } from '@/lib/blog-db'

type SocialCounts = Record<string, { likes: number; comments: number }>
type StatusFilter = 'all' | 'published' | 'draft'

type Props = {
  posts: BlogPostRow[]
  socialCounts: SocialCounts
  homepageFull: boolean
}

export default function AdminBlogBrowser({ posts, socialCounts, homepageFull }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const status = (searchParams.get('status') as StatusFilter | null) ?? 'all'
  const premiumOnly = searchParams.get('premium') === '1'

  const [query, setQuery] = useState(q)

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) params.delete(key)
    else params.set(key, value)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return posts.filter(p => {
      if (status === 'published' && p.status !== 'published') return false
      if (status === 'draft' && p.status === 'published') return false
      if (premiumOnly && !p.is_premium) return false
      if (term) {
        const hay = `${p.title} ${p.slug} ${p.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [posts, q, status, premiumOnly])

  const hasAnyFilter = q.trim() !== '' || status !== 'all' || premiumOnly

  return (
    <div>
      {/* FILTER BAR — modelled on the public /blog filter UI so the
          two views feel related. */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 mb-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onBlur={() => setParam('q', query.trim() || null)}
            onKeyDown={e => { if (e.key === 'Enter') setParam('q', query.trim() || null) }}
            placeholder="Search title, slug, tags…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {/* Status segmented pill */}
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
          {(['all', 'published', 'draft'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setParam('status', opt === 'all' ? null : opt)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded ${
                (opt === 'all' && status === 'all') || status === opt
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {opt === 'all' ? 'All' : opt === 'published' ? 'Published' : 'Drafts'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setParam('premium', premiumOnly ? null : '1')}
          aria-pressed={premiumOnly}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition-colors ${
            premiumOnly
              ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          {premiumOnly ? 'Premium only' : 'Premium'}
        </button>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => { setQuery(''); router.replace(pathname, { scroll: false }) }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 px-2.5 py-2"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Count line */}
      <p className="text-sm text-gray-500 mb-4">
        <strong className="text-gray-700">{filtered.length}</strong>
        {' '}of{' '}
        <strong className="text-gray-700">{posts.length}</strong>
        {' '}posts
      </p>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-5">
            {hasAnyFilter ? 'No posts match those filters.' : 'No posts yet. Start your first one with the wizard.'}
          </p>
          {!hasAnyFilter && (
            <Link href="/admin/blog/draft" className="btn-primary !py-2.5 !px-5 !text-sm inline-flex">
              <Plus className="w-4 h-4" /> New post
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {filtered.map(post => (
              <PostRow
                key={post.id}
                post={post}
                counts={socialCounts[post.slug]}
                homepageFull={homepageFull}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PostRow({
  post,
  counts,
  homepageFull,
}: {
  post: BlogPostRow
  counts: { likes: number; comments: number } | undefined
  homepageFull: boolean
}) {
  const updated = new Date(post.updated_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <li className="p-4 sm:p-5 hover:bg-gray-50 transition-colors">
      {/* On mobile this is a vertical stack: badges → title → meta →
          actions. On sm+ the actions float right of the content. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${
              post.status === 'published'
                ? 'bg-brand-100 text-brand-800'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {post.status}
            </span>
            {post.is_premium && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3" /> Premium
              </span>
            )}
            {post.homepage_featured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                <Pin className="w-3 h-3 fill-current" /> Homepage
              </span>
            )}
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
          <Link href={`/admin/blog/${post.id}/edit`} className="font-bold text-gray-900 hover:text-brand-700 leading-snug block">
            {post.title}
          </Link>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2.5 flex-wrap">
            <span>updated {updated}</span>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1" title="Views">
              <Eye className="w-3.5 h-3.5" /> {post.view_count}
            </span>
            <span className="inline-flex items-center gap-1" title="Likes">
              <Heart className="w-3.5 h-3.5" /> {counts?.likes ?? 0}
            </span>
            <span className="inline-flex items-center gap-1" title="Comments">
              <MessageCircle className="w-3.5 h-3.5" /> {counts?.comments ?? 0}
            </span>
          </p>
        </div>

        {/* Actions row. Stretches full-width on mobile so buttons
            don't squash; floats right on sm+. */}
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
          {post.status === 'published' && (
            <HomepagePinButton
              postId={post.id}
              initialPinned={post.homepage_featured}
              disabled={homepageFull}
            />
          )}
          {post.status === 'published' && (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md border border-gray-200 hover:bg-white"
            >
              View <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          <Link
            href={`/admin/blog/${post.id}/edit`}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-3 py-2 rounded-md border border-brand-200 hover:bg-brand-50"
          >
            Edit
          </Link>
        </div>
      </div>
    </li>
  )
}
