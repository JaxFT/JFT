import { listPublishedPosts, rowToView } from '@/lib/blog-db'
import BlogCard from '@/components/blog/BlogCard'
import type { Metadata } from 'next'
import Link from 'next/link'
import { X } from 'lucide-react'

export const metadata: Metadata = { title: 'Blog' }
export const dynamic = 'force-dynamic'

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const { tag: rawTag } = await searchParams
  const activeTag = typeof rawTag === 'string' && rawTag.trim() ? rawTag.trim() : null

  const rows = await listPublishedPosts()
  const allPosts = rows.map(rowToView)

  // Collect every unique tag across published posts (case-preserving, alphabetised)
  const tagCounts = new Map<string, number>()
  for (const p of allPosts) {
    for (const t of p.tags) {
      const trimmed = t.trim()
      if (!trimmed) continue
      tagCounts.set(trimmed, (tagCounts.get(trimmed) ?? 0) + 1)
    }
  }
  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  // Filter to the active tag if one is selected (case-insensitive match)
  const posts = activeTag
    ? allPosts.filter(p => p.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()))
    : allPosts

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">From the road</p>
          <h1 className="text-4xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-500 mt-2 text-lg">Stories and honest accounts from our travels.</p>
        </div>

        {/* Tag filter */}
        {sortedTags.length > 0 && (
          <div className="mb-10">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">Filter by topic</p>
            <div className="flex flex-wrap gap-2 items-center">
              <Link
                href="/blog"
                className={`text-sm font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                  activeTag === null
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                }`}
              >
                All
              </Link>
              {sortedTags.map(([t, count]) => {
                const isActive = activeTag?.toLowerCase() === t.toLowerCase()
                return (
                  <Link
                    key={t}
                    href={isActive ? '/blog' : `/blog?tag=${encodeURIComponent(t)}`}
                    className={`text-sm font-medium px-3.5 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                    }`}
                  >
                    {t}
                    <span className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
                    {isActive && <X className="w-3 h-3" />}
                  </Link>
                )
              })}
            </div>
            {activeTag && (
              <p className="text-sm text-gray-500 mt-3">
                Showing {posts.length} post{posts.length === 1 ? '' : 's'} tagged <strong className="text-gray-700">{activeTag}</strong>.
                {' '}
                <Link href="/blog" className="text-brand-600 hover:underline">Clear filter</Link>
              </p>
            )}
          </div>
        )}

        {posts.length === 0 ? (
          <p className="text-gray-400">
            {activeTag
              ? <>No posts tagged "{activeTag}" yet. <Link href="/blog" className="text-brand-600 hover:underline">See all</Link></>
              : <>No posts yet, check back soon.</>}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => <BlogCard key={post.slug} post={post} />)}
          </div>
        )}
      </div>
    </div>
  )
}
