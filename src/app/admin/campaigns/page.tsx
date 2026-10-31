import Link from 'next/link'
import type { Metadata } from 'next'
import { ShieldCheck, Link2 } from 'lucide-react'
import { listAllWebGuidesForAdmin } from '@/lib/guides-content-db'
import { listAllLegacyGuidesForAdmin } from '@/lib/guides-db'
import { listCampaignStats, listGuideDiscountCodeOptions } from '@/lib/campaign-links-db'
import CreateCampaignLinkForm from './CreateCampaignLinkForm'
import CampaignLinkRow from './CampaignLinkRow'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'Admin · Campaign links',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminCampaignsPage() {
  await requireAdminPage()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  const [webGuides, legacyGuides, stats, discountCodeOptions] = await Promise.all([
    listAllWebGuidesForAdmin(),
    listAllLegacyGuidesForAdmin(),
    listCampaignStats(),
    listGuideDiscountCodeOptions(),
  ])

  const guideOptions = [
    ...webGuides.filter(g => g.status === 'published').map(g => ({ slug: g.slug, label: g.title, pricePence: g.price_pence })),
    ...legacyGuides.filter(g => g.active).map(g => ({ slug: g.slug, label: g.name, pricePence: g.price_pence })),
  ]

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
            <span className="text-xs text-gray-400">/</span>
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Campaign links</p>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="w-7 h-7 text-brand-600" /> Campaign links
          </h1>
          <p className="text-gray-500 mt-1 max-w-2xl">
            Short links for guide promotions, e.g. an Instagram DM push. Each one tracks its own funnel: clicked → viewed the guide page → clicked buy → purchased.
            "Reached checkout" isn't shown separately, Stripe's page is a different domain we can't instrument, so the gap between "clicked buy" and "purchased" is the closest honest read on checkout drop-off.
          </p>
        </div>

        {guideOptions.length === 0 ? (
          <p className="text-sm text-gray-500">No published guides yet to link to.</p>
        ) : (
          <CreateCampaignLinkForm guides={guideOptions} siteUrl={siteUrl} discountCodes={discountCodeOptions} />
        )}

        {stats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No campaign links yet, create one above.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {stats.map(s => (
                <CampaignLinkRow key={s.id} stats={s} siteUrl={siteUrl} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
