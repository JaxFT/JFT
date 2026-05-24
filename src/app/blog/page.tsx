import { createClient } from '@/lib/supabase/server'
import { listPublishedPosts, rowToView } from '@/lib/blog-db'
import { loadCountsForSlugs } from '@/lib/blog-social-db'
import { listPublishedWebGuides } from '@/lib/guides-content-db'
import { listActiveGuides } from '@/lib/guides-db'
import { isPremiumTier } from '@/lib/profile'
import { isAdminEmail } from '@/lib/admin'
import BlogBrowser, { type GuideCardItem } from './BlogBrowser'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Blog' }
export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()
    isPremium = isPremiumTier(profile?.subscription_tier)
  }

  const rows = await listPublishedPosts()
  const posts = rows.map(rowToView)
  const counts = await loadCountsForSlugs(posts.map(p => p.slug))

  // Published guides (both modern web guides and the older PDF guides)
  // are mixed into the blog results so visitors can find guide content
  // from the same search surface. Guides keep their own /guides/[slug]
  // pages where the real paywall lives; non-premium viewers see guide
  // cards here so they can browse what they'd unlock, but clicking
  // through hits the per-guide paywall.
  const [webGuideRows, pdfGuideRows] = await Promise.all([
    listPublishedWebGuides(),
    listActiveGuides(),
  ])
  // If a slug exists as both a web guide and a legacy PDF guide, the
  // web version supersedes — same precedence as the /guides page.
  const webSlugs = new Set(webGuideRows.map(g => g.slug))
  // PDF guides don't carry a publish date. We give them a fixed old
  // anchor date so they sort below time-stamped blog posts and web
  // guides in the newest-first feed (rather than jumping to the top
  // every time the page loads).
  const PDF_GUIDE_ANCHOR_DATE = '2024-01-01T00:00:00Z'
  const guides: GuideCardItem[] = [
    ...webGuideRows.map(g => ({
      slug: g.slug,
      title: g.title,
      excerpt: g.subtitle ?? '',
      coverImage: g.cover_image ?? '',
      tags: g.tags,
      date: g.published_at ?? g.created_at,
      country: g.country,
    })),
    ...pdfGuideRows
      .filter(g => !webSlugs.has(g.slug))
      .map(g => ({
        slug: g.slug,
        title: g.name,
        excerpt: g.subtitle ?? '',
        coverImage: g.cover_image ?? '',
        tags: g.tags,
        date: PDF_GUIDE_ANCHOR_DATE,
        country: null,
      })),
  ]

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

        <BlogBrowser
          posts={posts}
          counts={counts}
          guides={guides}
          viewerIsPremium={isPremium}
          isAdmin={isAdminEmail(user?.email)}
        />
      </div>
    </div>
  )
}
