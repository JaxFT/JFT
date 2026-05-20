import { listPublishedPosts, rowToView } from '@/lib/blog-db'
import { loadCountsForSlugs } from '@/lib/blog-social-db'
import BlogBrowser from './BlogBrowser'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Blog' }
export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const rows = await listPublishedPosts()
  const posts = rows.map(rowToView)
  const counts = await loadCountsForSlugs(posts.map(p => p.slug))

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">From the road</p>
          <h1 className="text-4xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-500 mt-2 text-lg">
            Stories and honest accounts from our travels. Filter by where you&apos;re at, where you&apos;re going, or what you&apos;re trying to figure out.
          </p>
        </div>

        <BlogBrowser posts={posts} counts={counts} />
      </div>
    </div>
  )
}
