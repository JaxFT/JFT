import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { listActiveGuides } from '@/lib/guides-db'
import { listPublishedWebGuides } from '@/lib/guides-content-db'
import UpgradeButton from '@/components/billing/UpgradeButton'
import GuideBrowser, { type GuideCardModel } from './GuideBrowser'

export const metadata: Metadata = { title: 'Guides' }
export const dynamic = 'force-dynamic'

// Slugs we want pinned to the END of the listing regardless of date.
// 'how to save' belongs at the bottom because it's the foundational
// long-read, fresher destination guides go above it.
const PINNED_LAST = ['how-to-save-blueprint']

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
  const combined: GuideCardModel[] = [
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

  // Move pinned slugs to the bottom in the order they appear in
  // PINNED_LAST. Everything else keeps its existing order.
  const pinned = PINNED_LAST
    .map(slug => combined.find(g => g.slug === slug))
    .filter((g): g is GuideCardModel => !!g)
  const rest = combined.filter(g => !PINNED_LAST.includes(g.slug))
  const guides: GuideCardModel[] = [...rest, ...pinned]

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

        <GuideBrowser guides={guides} isPremium={isPremium} />
      </div>
    </div>
  )
}
