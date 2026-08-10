import Link from 'next/link'
import { ArrowRight, Crown } from 'lucide-react'
import { proxyImageUrl } from '@/lib/image-proxy'
import type { RelatedPostSummary } from '@/lib/blog-db'

// Shared "related posts" grid, used on both guide page types (web
// guides render it inside WebGuideView, legacy PDF guides render it
// directly in guides/[slug]/page.tsx). Renders nothing if the list
// is empty, callers don't need to guard on length themselves.
//
// `bare` skips the built-in max-w-3xl/padding wrapper — WebGuideView's
// outer container has no padding of its own (every section adds its
// own), but the legacy PDF guide page's container already applies
// padding, so it passes bare to avoid doubling up.
export default function RelatedPostsSection({
  posts, heading, bare = false,
}: {
  posts: RelatedPostSummary[]
  heading: string
  bare?: boolean
}) {
  if (posts.length === 0) return null
  return (
    <div className={bare ? 'mt-8' : 'max-w-3xl mx-auto px-4 sm:px-6 mt-12'}>
      <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">{heading}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:border-brand-200 hover:shadow-md transition-all"
          >
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              {post.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxyImageUrl(post.cover_image)}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `${post.cover_focal_x}% ${post.cover_focal_y}%` }}
                />
              ) : null}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {post.is_premium && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-full w-fit mb-1">
                  <Crown className="w-2.5 h-2.5" /> Premium
                </span>
              )}
              <p className="font-semibold text-sm text-gray-900 group-hover:text-brand-700 line-clamp-2">{post.title}</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 mt-1">
                Read <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
