import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { format } from 'date-fns'
import { Clock, ArrowLeft, Crown, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublishedPostBySlug, rowToView } from '@/lib/blog-db'
import { proxyImageUrl } from '@/lib/image-proxy'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import UpgradeButton from '@/components/billing/UpgradeButton'
import { ArticleJsonLd } from '@/components/seo/JsonLd'
import { remarkAutoLink } from '@/lib/blog-links'
import { getAutoLinkPhrases } from '@/lib/blog-links-server'
import { loadBlogPostSocial, getViewerProfile } from '@/lib/blog-social-db'
import { isAdminEmail } from '@/lib/admin'
import BlogSocial from '@/components/blog/BlogSocial'
import ShareButton from '@/components/blog/ShareButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const row = await getPublishedPostBySlug(slug)
  if (!row) return {}
  const description = row.excerpt ?? undefined
  const cover = row.cover_image ?? undefined
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  const url = `${siteUrl}/blog/${row.slug}`
  return {
    title: row.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: row.title,
      description,
      siteName: 'Jax | Family Travels',
      ...(cover ? { images: [{ url: cover, alt: row.title }] } : {}),
      ...(row.published_at ? { publishedTime: row.published_at } : {}),
      ...(row.updated_at ? { modifiedTime: row.updated_at } : {}),
      tags: row.tags,
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: row.title,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  }
}

function truncateMarkdownToPercent(md: string, percent: number): string {
  if (!md) return md
  const target = Math.max(80, Math.floor((md.length * percent) / 100))
  if (md.length <= target) return md
  // Snap to the next paragraph break after `target` so we don't cut mid-sentence.
  const after = md.indexOf('\n\n', target)
  return after === -1 ? md.slice(0, target) : md.slice(0, after)
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Fan out the independent fetches at once, post lookup, cookie client,
  // and the auto-link phrase table all run in parallel.
  const [row, supabase, autoLinkPhrases] = await Promise.all([
    getPublishedPostBySlug(slug),
    createClient(),
    getAutoLinkPhrases(),
  ])
  if (!row) notFound()
  const post = rowToView(row)

  const { data: { user } } = await supabase.auth.getUser()
  let userIsPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    userIsPremium = isPremiumTier(profile?.subscription_tier)
  }

  const gated = post.isPremium && !userIsPremium
  const visibleContent = gated ? truncateMarkdownToPercent(post.content, 20) : post.content

  // Social state — likes + comments. Loaded server-side so the post
  // renders with everything visible on first paint (SEO, no flicker)
  // then hydrates as a client island for interactions.
  const isAdmin = isAdminEmail(user?.email)
  const [social, viewerProfile] = await Promise.all([
    loadBlogPostSocial(slug, user?.id ?? null, isAdmin),
    getViewerProfile(),
  ])

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

  return (
    <div className="min-h-screen bg-white pt-20">
      <ArticleJsonLd
        url={`${siteUrl}/blog/${row.slug}`}
        headline={row.title}
        description={row.excerpt}
        image={row.cover_image}
        datePublished={row.published_at}
        dateModified={row.updated_at}
        tags={row.tags}
      />
      {post.coverImage && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8">
          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
            <img
              src={proxyImageUrl(post.coverImage)}
              alt={post.title}
              decoding="async"
              fetchPriority="high"
              className="w-full h-full object-cover"
              style={{ objectPosition: `${post.coverFocalX}% ${post.coverFocalY}%` }}
            />
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </Link>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {post.isPremium && (
            <span className="inline-flex items-center gap-1 text-xs font-bold tracking-widest uppercase text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
              <Crown className="w-3.5 h-3.5" /> Premium
            </span>
          )}
          {post.tags.map(tag => (
            <span key={tag} className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">{tag}</span>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 text-sm text-gray-400 mb-2 flex-wrap">
          <span>{post.author}</span>
          <span>·</span>
          <span>{format(new Date(post.date), 'MMMM d, yyyy')}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.readTime} min read</span>
          <span className="ml-auto">
            <ShareButton
              url={`${siteUrl}/blog/${slug}`}
              title={post.title}
              text={post.excerpt ?? undefined}
              stopPropagation={false}
            />
          </span>
        </div>
        {post.tripDate && (
          <p className="text-sm text-gray-500 italic mb-10 pb-8 border-b border-gray-100">
            We visited {format(new Date(post.tripDate), 'MMMM yyyy')}
          </p>
        )}
        {!post.tripDate && <div className="mb-10 pb-8 border-b border-gray-100" />}

        <div className="relative">
          <div className="prose-jft">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkAutoLink(autoLinkPhrases)]}
              components={{
                // Lazy-load body images and route Supabase URLs through
                // the edge-cached /img proxy so they're served from
                // Cloudflare's edge after first hit.
                img({ src, alt, title }) {
                  if (typeof src !== 'string') return null
                  // eslint-disable-next-line @next/next/no-img-element
                  return <img src={proxyImageUrl(src) || src} alt={alt ?? ''} title={title ?? undefined} loading="lazy" decoding="async" />
                },
              }}
            >{visibleContent}</ReactMarkdown>
          </div>

          {gated && (
            <>
              {/* Fade overlay sitting just above the paywall CTA */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-white/0 to-white" />
            </>
          )}
        </div>

        {gated && (
          <div className="mt-2 bg-brand-950 text-white rounded-2xl p-6 sm:p-8 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-brand-300 mb-3">
              <Crown className="w-3.5 h-3.5" /> Premium post
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Keep reading with Premium</h2>
            <p className="text-white/70 leading-relaxed max-w-md mx-auto mb-6">
              A year of access to every premium blog post, every guide, and every adventure pack, £49.99, cancel any time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {user ? (
                <UpgradeButton className="btn-primary text-base px-7 py-3" />
              ) : (
                <>
                  <Link href={`/signup?next=/blog/${slug}`} className="btn-primary text-base px-7 py-3">
                    Sign up to read <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href={`/login?next=/blog/${slug}`} className="text-sm font-medium text-white/70 hover:text-white underline underline-offset-4 decoration-white/30">
                    Already a member? Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* Comments + likes. Renders for everyone (signed in or not);
            the client component handles the auth gate for interactions. */}
        {!gated && (
          <BlogSocial
            postSlug={slug}
            initialPostLikes={social.postLikes}
            initialPostLikedByMe={social.postLikedByMe}
            initialComments={social.comments}
            viewerUserId={viewerProfile.userId}
            initialViewerUsername={viewerProfile.username}
            initialViewerUsernameIsInstagram={viewerProfile.username_is_instagram}
            initialViewerInstagram={viewerProfile.instagram_handle}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  )
}
