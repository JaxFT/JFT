import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Crown, Download, Check } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { getGuideBySlug, userHasPurchased, formatPrice } from '@/lib/guides-db'
import { getWaystaqDiscountState } from '@/lib/waystaq-discount'
import { ArticleJsonLd } from '@/components/seo/JsonLd'
import { getPublishedWebGuideBySlug } from '@/lib/guides-content-db'
import { userHasPurchasedWebGuide } from '@/lib/web-guide-purchases-db'
import { claimWebGuidePurchase } from '@/lib/claim-web-guide-purchase'
import { claimGuidePurchase } from '@/lib/claim-guide-purchase'
import { isAdminEmail } from '@/lib/admin'
import { getAboutUs } from '@/lib/app-settings'
import { getAutoLinkPhrases } from '@/lib/blog-links-server'
import { listPublishedPostsByCountrySlug } from '@/lib/blog-db'
import { resolveCountrySlug, resolveCountrySlugFromTags, findOtherGuidesForCountrySlug } from '@/lib/related-content'
import RelatedPostsSection from '@/components/RelatedPostsSection'
import RelatedGuidesSection from '@/components/RelatedGuidesSection'
import WebGuideView from '@/components/guide/WebGuideView'
import GuideViewTracker from '@/components/guide/GuideViewTracker'
import DownloadPdfButton from '@/components/guide/DownloadPdfButton'
import PdfPostPurchase from '@/components/guide/PdfPostPurchase'
import GuideViewer from './GuideViewer'
import BuyButton from './BuyButton'
import UpgradeButton from '@/components/billing/UpgradeButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  const url = `${siteUrl}/guides/${slug}`

  const webGuide = await getPublishedWebGuideBySlug(slug)
  if (webGuide) {
    const description = webGuide.subtitle ?? undefined
    const cover = webGuide.cover_image ?? undefined
    return {
      title: webGuide.title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: 'article',
        url,
        title: webGuide.title,
        description,
        siteName: 'Jax | Family Travels',
        ...(cover ? { images: [{ url: cover, alt: webGuide.title }] } : {}),
        ...(webGuide.published_at ? { publishedTime: webGuide.published_at } : {}),
        ...(webGuide.updated_at ? { modifiedTime: webGuide.updated_at } : {}),
        tags: webGuide.tags,
      },
      twitter: {
        card: cover ? 'summary_large_image' : 'summary',
        title: webGuide.title,
        description,
        ...(cover ? { images: [cover] } : {}),
      },
    }
  }

  const guide = await getGuideBySlug(slug)
  if (!guide) return {}
  const description = guide.subtitle ?? undefined
  const cover = guide.cover_image ?? undefined
  return {
    title: guide.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: guide.name,
      description,
      siteName: 'Jax | Family Travels',
      ...(cover ? { images: [{ url: cover, alt: guide.name }] } : {}),
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: guide.name,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  }
}

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams

  // Fire ALL the read-side fetches in parallel up front. About-us and
  // auto-link phrases are only used for the web-guide path, but firing
  // them eagerly is cheaper than serialising, the web path is the
  // hot path now that the PDF flow is being retired.
  const [webGuide, supabase, aboutUs, autoLinkPhrases, wsDiscountState] = await Promise.all([
    getPublishedWebGuideBySlug(slug),
    createClient(),
    getAboutUs(),
    getAutoLinkPhrases(),
    getWaystaqDiscountState(),
  ])
  const wsDiscount = wsDiscountState.active

  // ─── New web-rendered guides win if a row exists. ───
  if (webGuide) {
    const { data: { user } } = await supabase.auth.getUser()

    // Stripe success return: ?session_id=… is set by the checkout
    // success_url. The session_id itself authorises the download
    // (the API verifies it against Stripe before streaming), so we
    // can let a totally signed-out guest grab their file with zero
    // friction. We still claim the purchase as a sync backup to the
    // webhook so the row exists in our records.
    const sessionId = typeof sp.session_id === 'string' ? sp.session_id : null
    let freshPurchase: { sessionId: string; email: string | null } | null = null
    if (sessionId) {
      const claim = await claimWebGuidePurchase({ sessionId })
      freshPurchase = {
        sessionId,
        email: claim.ok ? (claim.email || null) : null,
      }
    }

    let isPremium = false
    let hasPurchasedDownload = false
    if (user) {
      // Profile + download-purchase lookup both need user.id but are
      // independent — fire them together.
      const [{ data: profile }, dl] = await Promise.all([
        supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single(),
        userHasPurchasedWebGuide(user.id, webGuide.id),
      ])
      isPremium = isPremiumTier(profile?.subscription_tier)
      hasPurchasedDownload = dl
    }
    const adminWeb = isAdminEmail(user?.email)
    const canViewFull = isPremium || !webGuide.is_premium || adminWeb
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
    const webGuideCountrySlug = resolveCountrySlug(webGuide.country)
    const [relatedPosts, relatedGuides] = await Promise.all([
      webGuideCountrySlug
        ? listPublishedPostsByCountrySlug(webGuideCountrySlug, { limit: 4 })
        : Promise.resolve([]),
      webGuideCountrySlug
        ? findOtherGuidesForCountrySlug(webGuideCountrySlug, webGuide.slug)
        : Promise.resolve([]),
    ])
    return (
      <>
        <ArticleJsonLd
          url={`${siteUrl}/guides/${webGuide.slug}`}
          headline={webGuide.title}
          description={webGuide.subtitle}
          image={webGuide.cover_image}
          datePublished={webGuide.published_at}
          dateModified={webGuide.updated_at}
          tags={webGuide.tags}
        />
        <GuideViewTracker slug={webGuide.slug} />
        <WebGuideView
          guide={webGuide}
          aboutUsMarkdown={aboutUs}
          autoLinkPhrases={autoLinkPhrases}
          relatedPosts={relatedPosts}
          relatedGuides={relatedGuides}
          canViewFull={canViewFull}
          isLoggedIn={!!user}
          isPremium={isPremium}
          hasPurchasedDownload={hasPurchasedDownload}
          isAdmin={adminWeb}
          freshPurchase={freshPurchase}
          wsDiscount={wsDiscount}
        />
      </>
    )
  }

  // ─── Existing PDF guides fall back to the original flow. ───
  const guide = await getGuideBySlug(slug)
  if (!guide || !guide.active) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  let isPremium = false
  let hasPurchased = false
  if (user) {
    // Profile lookup and purchase check both need user.id but are
    // independent, fire them together.
    const [{ data: profile }, hp] = await Promise.all([
      supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single(),
      userHasPurchased(user.id, guide.id),
    ])
    isPremium = isPremiumTier(profile?.subscription_tier)
    hasPurchased = hp
  }

  // Guest (or already-logged-in) return from Stripe checkout for THIS
  // purchase flow. Claiming here (not just relying on the webhook) is
  // what unlocks the page immediately instead of the buyer landing on
  // a still-locked guide until the webhook catches up. Idempotent, see
  // claim-guide-purchase.ts.
  const pdfSessionId = typeof sp.session_id === 'string' ? sp.session_id : null
  let pdfFreshPurchase: { sessionId: string; email: string | null } | null = null
  if (pdfSessionId) {
    const claim = await claimGuidePurchase({ sessionId: pdfSessionId })
    if (claim.ok) {
      pdfFreshPurchase = { sessionId: pdfSessionId, email: claim.email || null }
    }
  }

  // Admins can view + download any legacy PDF guide for free — same
  // logic as the new web guides. Lets us QA without paying.
  const admin = isAdminEmail(user?.email)
  const canViewFull = isPremium || hasPurchased || admin || !!pdfFreshPurchase
  const canDownload = hasPurchased || admin || !!pdfFreshPurchase
  const fullAvailable = !!guide.full_path

  const pdfGuideCountrySlug = resolveCountrySlugFromTags(guide.tags)
  const [relatedPosts, relatedGuides] = await Promise.all([
    pdfGuideCountrySlug
      ? listPublishedPostsByCountrySlug(pdfGuideCountrySlug, { limit: 4 })
      : Promise.resolve([]),
    pdfGuideCountrySlug
      ? findOtherGuidesForCountrySlug(pdfGuideCountrySlug, guide.slug)
      : Promise.resolve([]),
  ])

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

        {/* ACCESS STATE BADGE, only shown once there's actually an
            access state to report (purchased/premium) — the old
            "Preview, first N pages" badge here looked clickable but
            did nothing, the real preview is the viewer further down. */}
        {canViewFull && (
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-800 text-sm font-medium px-3 py-1.5 rounded-full">
              {isPremium && !hasPurchased && <><Crown className="w-3.5 h-3.5" /> Premium access, full guide</>}
              {(hasPurchased || (!!pdfFreshPurchase && !isPremium)) && <><Check className="w-3.5 h-3.5" /> Purchased, full access</>}
            </div>
          </div>
        )}

        {/* ONE-OFF PURCHASE, shown immediately on landing so buying
            doesn't require scrolling past the preview first. */}
        {!canViewFull && (
          <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-brand-600" />
                <p className="text-xs font-bold tracking-widest uppercase text-brand-600">Buy as a one-off</p>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatPrice(guide.price_pence)}</h3>
              <p className="text-sm text-gray-500">Pay once. Download the full PDF and keep it on your device forever.</p>
            </div>
            <div className="sm:w-56 shrink-0">
              <BuyButton slug={guide.slug} priceLabel={formatPrice(guide.price_pence)} />
            </div>
          </div>
        )}

        {/* DESCRIPTION, skipped when it's just a repeat of the subtitle
            already shown in the header above (some older guides have
            the same sentence saved in both fields). */}
        {guide.description && guide.description.trim() !== guide.subtitle?.trim() && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <p className="text-gray-600 leading-relaxed">{guide.description}</p>
          </div>
        )}

        {/* PDF VIEWER */}
        <GuideViewer
          slug={guide.slug}
          mode={canViewFull && fullAvailable ? 'full' : 'preview'}
          previewPageCount={guide.preview_page_count}
          sessionId={pdfFreshPurchase?.sessionId}
        />

        {pdfFreshPurchase && (
          <PdfPostPurchase slug={guide.slug} sessionId={pdfFreshPurchase.sessionId} email={pdfFreshPurchase.email} />
        )}

        {/* PREMIUM UPGRADE, shown under the preview as the "or" option
            once someone has seen enough of the guide to want more. */}
        {!canViewFull && (
          <div className="mt-8 bg-brand-950 text-white rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-brand-300" />
                <p className="text-xs font-bold tracking-widest uppercase text-brand-300">Or unlock everything</p>
              </div>
              <h3 className="text-2xl font-bold mb-1">
                {wsDiscount ? (
                  <>£25 / year <span className="text-white/40 line-through font-normal text-lg">£49.99</span></>
                ) : '£49.99 / year, or £5 / month'}
              </h3>
              <p className="text-sm text-white/70">Every premium blog post, every guide, and every adventure pack.</p>
            </div>
            <div className="sm:w-56 shrink-0">
              {user ? (
                <UpgradeButton className="btn-primary w-full justify-center !text-sm" />
              ) : (
                <Link href={`/signup?next=/guides/${guide.slug}`} className="btn-primary w-full justify-center !text-sm">
                  Sign up, get Premium <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* DOWNLOAD CTA for returning purchasers. Skipped right after a
            fresh purchase — PdfPostPurchase above already covers that
            moment, no need for two download buttons stacked. */}
        {canDownload && !pdfFreshPurchase && (
          <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">Your purchase</p>
              <h3 className="font-bold text-gray-900">Download the full PDF</h3>
              <p className="text-sm text-gray-500 mt-1">You bought this guide, yours to keep.</p>
            </div>
            <DownloadPdfButton slug={guide.slug} />
          </div>
        )}

        <RelatedGuidesSection guides={relatedGuides} heading="More guides for this country" bare />

        <RelatedPostsSection posts={relatedPosts} heading="More from the blog" bare />

        {/* PREMIUM NOTE */}
        {isPremium && !hasPurchased && fullAvailable && (
          <p className="text-xs text-gray-400 mt-6 text-center">
            On-site reading is included in Premium. To keep a personal copy offline, you can also buy this guide as a one-off.
          </p>
        )}
      </div>
    </div>
  )
}
