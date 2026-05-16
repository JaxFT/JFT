import type { Metadata } from 'next'
import Link from 'next/link'
import { Map, ArrowRight } from 'lucide-react'
import { listActiveGuides, formatPrice } from '@/lib/guides-db'

export const metadata: Metadata = { title: 'Guides' }
export const dynamic = 'force-dynamic'

export default async function GuidesPage() {
  const guides = await listActiveGuides()

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

        {/* Premium banner */}
        <div className="bg-brand-950 text-white rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Get every guide for £25/year</p>
            <p className="text-white/60 text-sm">
              Premium membership includes on-site access to every guide, the travel tool, and learning packs. View on the site (no downloads).
            </p>
          </div>
          <Link href="/signup?next=/account" className="btn-primary shrink-0">
            Go Premium <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {guides.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
            <Map className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p>No guides yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map(guide => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-brand-200 transition-all"
              >
                {/* Cover */}
                <div className="h-48 bg-gradient-to-br from-brand-100 via-brand-50 to-brand-200 flex items-center justify-center relative overflow-hidden">
                  {guide.cover_image ? (
                    <img src={guide.cover_image} alt={guide.name} className="w-full h-full object-cover" />
                  ) : (
                    <Map className="w-14 h-14 text-brand-400" />
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {guide.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 leading-snug">{guide.name}</h3>
                  {guide.subtitle && (
                    <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3">{guide.subtitle}</p>
                  )}
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                    <span className="font-bold text-gray-900">{formatPrice(guide.price_pence)}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">
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
