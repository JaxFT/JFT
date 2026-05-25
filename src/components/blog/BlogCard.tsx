import { ArrowRight, Clock, Crown, Heart, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { BlogPost } from '@/types'
import { proxyImageUrl } from '@/lib/image-proxy'
import { getPackByIso2, getPackMeta } from '@/lib/adventurePackMeta'
import { BLOG_TOPIC_LABEL, type BlogTopic } from '@/lib/blog-meta'
import ShareButton from './ShareButton'

// BlogCard accepts the richer BlogPostView shape at runtime — both
// callers (homepage + /blog) pass it. The type is permissive on the
// way in so the existing BlogPost contract still compiles, but the
// extra fields drive the meaningful place / topic tags.
type CardPost = BlogPost & {
  destinationCountry?: string | null
  topics?: BlogTopic[]
}

// Resolve a country tag (flag + name) from either a pack slug
// ("thailand") or an ISO2 ("th"). Returns null if no match — country
// strings can be inconsistent in old data.
function resolveCountry(value: string | null | undefined): { flag: string; country: string } | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (!v) return null
  return getPackMeta(v) ?? getPackByIso2(v)
}

// Plain <a> (not next/link) to avoid the brief unstyled-flash that
// CSR navigation produced on this card. Tradeoff: ~300 ms slower per
// click, worth it for a clean transition.

type Props = {
  post: CardPost
  // Optional counts — listing pages pass these in via the batched
  // loadCountsForSlugs query. Cards render without counts gracefully
  // if the prop isn't provided.
  counts?: { likes: number; comments: number }
}

export default function BlogCard({ post, counts }: Props) {
  // Tag chips: place first (flag + country), then up to two topic
  // labels from the typed topics enum. The free-form `tags` array is
  // intentionally NOT rendered here — those were a grab-bag of random
  // words and didn't tell a reader anything useful at a glance.
  const place = resolveCountry(post.destinationCountry)
  const topicChips = (post.topics ?? []).slice(0, 2)

  return (
    <a href={`/blog/${post.slug}`} className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      {post.coverImage && (
        <div className="overflow-hidden h-48">
          <img
            src={proxyImageUrl(post.coverImage)}
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ objectPosition: `${post.coverFocalX ?? 50}% ${post.coverFocalY ?? 50}%` }}
          />
        </div>
      )}
      <div className="flex flex-col flex-1 p-5">
        {(place || topicChips.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {place && (
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <span aria-hidden>{place.flag}</span>
                {place.country}
              </span>
            )}
            {topicChips.map(t => (
              <span key={t} className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{BLOG_TOPIC_LABEL[t]}</span>
            ))}
          </div>
        )}
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3">{post.excerpt}</p>
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{post.readTime} min read</span>
              <span className="mx-1.5">·</span>
              <span>{format(new Date(post.date), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              {post.isPremium && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" /> Premium
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-brand-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          {/* Likes / comments / share — sits below the meta so the
              card keeps its existing layout footprint. */}
          <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {counts?.likes ?? 0}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> {counts?.comments ?? 0}
              </span>
            </div>
            <ShareButton
              url={`/blog/${post.slug}`}
              title={post.title}
              text={post.excerpt ?? undefined}
            />
          </div>
        </div>
      </div>
    </a>
  )
}
