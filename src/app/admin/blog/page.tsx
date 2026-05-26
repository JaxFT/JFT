import Link from 'next/link'
import { Plus, ShieldCheck, Upload, Link2, Pin } from 'lucide-react'
import type { Metadata } from 'next'
import { listAllPostsForAdmin, MAX_HOMEPAGE_FEATURED } from '@/lib/blog-db'
import { loadCountsForSlugs } from '@/lib/blog-social-db'
import AdminBlogBrowser from './AdminBlogBrowser'

export const metadata: Metadata = {
  title: 'Admin · Blog Posts',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminBlogListPage() {
  const posts = await listAllPostsForAdmin()
  const featuredCount = posts.filter(p => p.homepage_featured).length
  const homepageFull = featuredCount >= MAX_HOMEPAGE_FEATURED

  // Per-slug likes + comments aggregation. Views live on the post
  // row itself (blog_posts.view_count) so they come back with the
  // posts query directly.
  const socialCounts = await loadCountsForSlugs(posts.map(p => p.slug))

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
            <span className="text-xs text-gray-400">/</span>
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Blog Posts</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Blog posts</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Drafts and published posts. Generate new ones with the writer or edit existing ones below.</p>
          <p className="text-xs text-gray-500 mt-2 inline-flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 text-brand-600" />
            Homepage features: <span className="font-semibold text-gray-700">{featuredCount}/{MAX_HOMEPAGE_FEATURED}</span>
          </p>

          {/* Action buttons. Wrap to a new line on small screens so
              the header doesn't sprawl into a tall right-hand column. */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href="/admin/blog/links" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-lg">
              <Link2 className="w-4 h-4" /> Auto-links
            </Link>
            <Link href="/admin/blog/import" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3.5 py-2 rounded-lg">
              <Upload className="w-4 h-4" /> Paste / import
            </Link>
            <Link href="/admin/blog/draft" className="btn-primary !py-2 !px-4 !text-sm">
              <Plus className="w-4 h-4" /> New post
            </Link>
          </div>
        </div>

        <AdminBlogBrowser posts={posts} socialCounts={socialCounts} homepageFull={homepageFull} />
      </div>
    </div>
  )
}
