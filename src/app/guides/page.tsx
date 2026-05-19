import type { Metadata } from 'next'
import Link from 'next/link'
import { Map, ArrowRight, Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { listActiveGuides, formatPrice } from '@/lib/guides-db'
import { listPublishedWebGuides } from '@/lib/guides-content-db'
import UpgradeButton from '@/components/billing/UpgradeButton'

export const metadata: Metadata = { title: 'Guides' }
export const dynamic = 'force-dynamic'

type GuideCardModel = {
  slug: string
  name: string
  subtitle: string | null
  cover_image: string | null
  tags: string[]
  price_pence: number
}

export default async function GuidesPage() {
  // Fire all the data fetches in parallel, none depend on user state.
  const [pdfGuides, webGuides, supabase] = await Promise.all([
    listActiveGuides(),
    listPublishedWebGuides(),
    createClient(),
  ])

  // Merge into one list. Web guides first (newest published_at on top).
  // Hide any PDF guide whose slug is also present as a published web guide.
  // The web version supersedes the PDF.
  const webSlugs = new Set(webGuides.map(g => g.slug))
  const guides: GuideCardModel[] = [
    ...webGuides.map(g => ({
      slug: g.slug,
      name: g.title,
      subtitle: g.subtitle,
      cover_image: g.cover_image,
      tags: g.tags,
      price_pence: g.price_pence,
    })),
    ...pdfGuides
      .filter(g => !webSlugs.has(g.slug))
      .map(g => ({
        slug: g.slug,
        name: g.name,
        subtitle: g.subtitle,
        cover_image: g.cover_image,
        tags: g.tags,
        price_pence: g.price_pence,
      })),
  ]

  const { data: { user } } = await supabase.auth.getUser()
  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    isPremium = isPremiumTier(profile?.subscription_tier)
  }

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Resources</p>
          <h1 className="text-4xl font-bold text-gray-900">Guides</h1>
          <p className="text-gray-500 mt-2 text-lg">
            Practical destination and planning guides written from real family travel. Buy individually or get every guide with Premium.
          </p>
        </div>

        {/* Premium banner, hidden for premium members */}
        {isPremium ? (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-10 flex items-center gap-3 text-brand-900">
            <Crown className="w-5 h-5 text-brand-700 shrink-0" />
            <p className="text-sm">
              <strong>Premium member.</strong> Every guide below is included, click any to read on the site.
            </p>
          </div>
        ) : (
          <div className="bg-brand-950 text-white rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-lg">Premium, £49.99/year</p>
              <p className="text-white/60 text-sm">
                A year of access to every premium blog post, every guide, and every adventure pack. View on the site, no downloads.
              </p>
            </div>
            {user ? (
              <div className="shrink-0">
                <UpgradeButton label="Go Premium" />
              </div>
            ) : (
              <Link href="/signup?next=/account" className="btn-primary shrink-0">
                Go Premium <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        {guides.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
            <Map className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p>No guides yet, check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map(guide => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all aspect-[3/4] block"
              >
                {/* Full-card cover image */}
                {guide.cover_image ? (
                  <img
                    src={guide.cover_image}
                    alt={guide.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-200 via-brand-300 to-brand-500 flex items-center justify-center">
                    <Map className="w-16 h-16 text-brand-800" />
                  </div>
                )}

                {/* Tags floating top-left */}
                {guide.tags.length > 0 && (
                  <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 max-w-[calc(100%-2rem)]">
                    {guide.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="text-xs font-semibold text-white bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Opaque bottom panel, sits over the image */}
                <div className="absolute inset-x-0 bottom-0 bg-brand-950/85 backdrop-blur-sm text-white p-5">
                  <h3 className="font-bold leading-snug mb-1 line-clamp-2">{guide.name}</h3>
                  {guide.subtitle && (
                    <p className="text-sm text-white/70 leading-snug line-clamp-2 mb-3">{guide.subtitle}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-white/15">
                    {isPremium ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase text-brand-200">
                        <Crown className="w-3.5 h-3.5" /> Included
                      </span>
                    ) : (
                      <span className="font-bold text-base">{formatPrice(guide.price_pence)}</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-200 group-hover:gap-2 transition-all">
                      View <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
