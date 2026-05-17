import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Lock, Crown, Download, Check } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getGuideBySlug, userHasPurchased, formatPrice } from '@/lib/guides-db'
import { getPublishedWebGuideBySlug } from '@/lib/guides-content-db'
import { getAboutUs } from '@/lib/app-settings'
import { getAutoLinkPhrases } from '@/lib/blog-links'
import WebGuideView from '@/components/guide/WebGuideView'
import GuideViewer from './GuideViewer'
import BuyButton from './BuyButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const webGuide = await getPublishedWebGuideBySlug(slug)
  if (webGuide) return { title: webGuide.title, description: webGuide.subtitle ?? undefined }
  const guide = await getGuideBySlug(slug)
  if (!guide) return {}
  return { title: guide.name, description: guide.subtitle ?? undefined }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // ─── New web-rendered guides win if a row exists. ───
  const webGuide = await getPublishedWebGuideBySlug(slug)
  if (webGuide) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let isPremium = false
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()
      isPremium = profile?.subscription_tier === 'premium'
    }
    const canViewFull = isPremium || !webGuide.is_premium
    const [aboutUs, autoLinkPhrases] = await Promise.all([
      getAboutUs(),
      getAutoLinkPhrases(),
    ])
    return (
      <WebGuideView
        guide={webGuide}
        aboutUsMarkdown={aboutUs}
        autoLinkPhrases={autoLinkPhrases}
        canViewFull={canViewFull}
        isLoggedIn={!!user}
        isPremium={isPremium}
      />
    )
  }

  // ─── Existing PDF guides fall back to the original flow. ───
  const guide = await getGuideBySlug(slug)
  if (!guide || !guide.active) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPremium = false
  let hasPurchased = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    isPremium = profile?.subscription_tier === 'premium'
    hasPurchased = await userHasPurchased(user.id, guide.id)
  }

  const canViewFull = isPremium || hasPurchased
  const canDownload = hasPurchased
  const fullAvailable = !!guide.full_path

  return (
    <div className="min-h-screen bg-sand-50 pt-20 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6 mt-4">
          <ArrowLeft className="w-4 h-4" /> All guides
        </Link>

        {/* HEADER */}
        <div className="mb-8 max-w-3xl">
          <div className="flex flex-wrap gap-2 mb-3">
            {guide.tags.map(tag => (
              <span key={tag} className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3">{guide.name}</h1>
          {guide.subtitle && <p className="text-lg text-gray-600 leading-relaxed">{guide.subtitle}</p>}
        </div>

        {/* ACCESS STATE BADGE */}
        <div className="mb-6">
          {canViewFull ? (
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-800 text-sm font-medium px-3 py-1.5 rounded-full">
              {isPremium && !hasPurchased && <><Crown className="w-3.5 h-3.5" /> Premium access — full guide</>}
              {hasPurchased && <><Check className="w-3.5 h-3.5" /> Purchased — full access</>}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-3 py-1.5 rounded-full">
              <Lock className="w-3.5 h-3.5" /> Preview — first {guide.preview_page_count} pages
            </div>
          )}
        </div>

        {/* DESCRIPTION */}
        {guide.description && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <p className="text-gray-600 leading-relaxed">{guide.description}</p>
          </div>
        )}

        {/* PDF VIEWER */}
        <GuideViewer
          slug={guide.slug}
          mode={canViewFull && fullAvailable ? 'full' : 'preview'}
          previewPageCount={guide.preview_page_count}
        />

        {/* PURCHASE CTAs */}
        {!canViewFull && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* One-off purchase */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-brand-600" />
                <p className="text-xs font-bold tracking-widest uppercase text-brand-600">Buy as a one-off</p>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatPrice(guide.price_pence)}</h3>
              <p className="text-sm text-gray-500 mb-5 flex-1">Pay once. Download the full PDF and keep it on your device forever.</p>
              <BuyButton slug={guide.slug} priceLabel={formatPrice(guide.price_pence)} />
            </div>

            {/* Premium upgrade */}
            <div className="bg-brand-950 text-white rounded-2xl shadow-sm p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-brand-300" />
                <p className="text-xs font-bold tracking-widest uppercase text-brand-300">Or unlock everything</p>
              </div>
              <h3 className="text-2xl font-bold mb-1">£25 / year</h3>
              <p className="text-sm text-white/70 mb-5 flex-1">A year of access to every premium blog post, every guide, and every learning pack.</p>
              {user ? (
                <Link href="/account" className="btn-primary w-full justify-center !text-sm">
                  Upgrade to Premium <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link href={`/signup?next=/guides/${guide.slug}`} className="btn-primary w-full justify-center !text-sm">
                  Sign up — get Premium <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* DOWNLOAD CTA — only for one-off purchasers */}
        {canDownload && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">Your purchase</p>
              <h3 className="font-bold text-gray-900">Download the full PDF</h3>
              <p className="text-sm text-gray-500 mt-1">You bought this guide — yours to keep.</p>
            </div>
            <a
              href={`/api/guides/${guide.slug}/url?kind=download`}
              className="btn-primary !py-2.5 !px-5 !text-sm shrink-0"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        )}

        {/* PREMIUM NOTE */}
        {isPremium && !hasPurchased && fullAvailable && (
          <p className="text-xs text-gray-400 mt-6 text-center">
            On-site reading is included in Premium. To keep a personal copy offline, you can also buy this guide as a one-off (Stripe coming soon).
          </p>
        )}
      </div>
    </div>
  )
}
