import { listPublishedPosts, rowToView } from '@/lib/blog-db'
import BlogCard from '@/components/blog/BlogCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Blog' }
export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const rows = await listPublishedPosts()
  const posts = rows.map(rowToView)

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">From the road</p>
          <h1 className="text-4xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-500 mt-2 text-lg">Stories, guides, and honest accounts from our travels.</p>
        </div>

        {posts.length === 0 ? (
          <p className="text-gray-400">No posts yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => <BlogCard key={post.slug} post={post} />)}
          </div>
        )}
      </div>
    </div>
  )
}
