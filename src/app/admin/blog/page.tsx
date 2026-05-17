import Link from 'next/link'
import { Plus, FileText, ExternalLink, ShieldCheck, Upload, Crown } from 'lucide-react'
import type { Metadata } from 'next'
import { listAllPostsForAdmin } from '@/lib/blog-db'

export const metadata: Metadata = {
  title: 'Admin · Blog Posts',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminBlogListPage() {
  const posts = await listAllPostsForAdmin()

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
              <span className="text-xs text-gray-400">/</span>
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Blog Posts</p>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Blog posts</h1>
            <p className="text-gray-500 mt-1">Drafts and published posts. Generate new ones with the writer or edit existing ones below.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/admin/blog/import" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg">
              <Upload className="w-4 h-4" /> Paste / import
            </Link>
            <Link href="/admin/blog/draft" className="btn-primary !py-2.5 !px-5 !text-sm">
              <Plus className="w-4 h-4" /> New post
            </Link>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-5">No posts yet. Start your first one with the wizard.</p>
            <Link href="/admin/blog/draft" className="btn-primary !py-2.5 !px-5 !text-sm inline-flex">
              <Plus className="w-4 h-4" /> New post
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {posts.map(post => {
                const updated = new Date(post.updated_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
                return (
                  <li key={post.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${
                          post.status === 'published'
                            ? 'bg-brand-100 text-brand-800'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {post.status}
                        </span>
                        {post.is_premium && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold tracking-widest uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                            <Crown className="w-3 h-3" /> Premium
                          </span>
                        )}
                        {post.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                      <Link href={`/admin/blog/${post.id}/edit`} className="font-bold text-gray-900 hover:text-brand-700">
                        {post.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        /{post.slug} · updated {updated}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
