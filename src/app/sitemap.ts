// Auto-generated XML sitemap for Google + other search engines.
// Lists static pages + every published blog post + every published web guide.
// Cloudflare serves it at https://jaxfamilytravels.com/sitemap.xml.

import type { MetadataRoute } from 'next'
import { listPublishedPosts } from '@/lib/blog-db'
import { listPublishedWebGuides } from '@/lib/guides-content-db'
import { listActiveGuides } from '@/lib/guides-db'

export const dynamic = 'force-dynamic'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

const STATIC_ROUTES: Array<{ path: string; priority?: number; freq?: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/',                  priority: 1.0, freq: 'weekly' },
  { path: '/blog',              priority: 0.9, freq: 'daily' },
  { path: '/guides',            priority: 0.9, freq: 'weekly' },
  { path: '/i-want-to-travel',  priority: 0.7, freq: 'monthly' },
  { path: '/learning',          priority: 0.6, freq: 'monthly' },
  { path: '/work-with-us',      priority: 0.6, freq: 'monthly' },
  { path: '/planning',          priority: 0.5, freq: 'monthly' },
  { path: '/privacy',           priority: 0.3, freq: 'yearly' },
  { path: '/terms',             priority: 0.3, freq: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, webGuides, pdfGuides] = await Promise.all([
    listPublishedPosts(),
    listPublishedWebGuides(),
    listActiveGuides(),
  ])

  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(r => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }))

  const postEntries: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : new Date(p.updated_at),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // Web guides: take precedence over any legacy PDF guide with the same slug.
  const webSlugs = new Set(webGuides.map(g => g.slug))
  const guideEntries: MetadataRoute.Sitemap = [
    ...webGuides.map(g => ({
      url: `${SITE}/guides/${g.slug}`,
      lastModified: g.published_at ? new Date(g.published_at) : new Date(g.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...pdfGuides
      .filter(g => !webSlugs.has(g.slug))
      .map(g => ({
        url: `${SITE}/guides/${g.slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
  ]

  return [...staticEntries, ...postEntries, ...guideEntries]
}
