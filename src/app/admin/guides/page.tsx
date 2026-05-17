import Link from 'next/link'
import { Map, ExternalLink, ShieldCheck, Users, BookOpen, FileText, Upload } from 'lucide-react'
import type { Metadata } from 'next'
import { listAllWebGuidesForAdmin } from '@/lib/guides-content-db'
import { listAllLegacyGuidesForAdmin } from '@/lib/guides-db'
import NewGuideButton from './NewGuideButton'
import LegacyGuideRow from './LegacyGuideRow'
import DeleteGuideButton from './DeleteGuideButton'

export const metadata: Metadata = {
  title: 'Admin · Guides',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminGuidesListPage() {
  const [guides, legacyGuides] = await Promise.all([
    listAllWebGuidesForAdmin(),
    listAllLegacyGuidesForAdmin(),
  ])
  const publishedWebSlugs = new Set(
    guides.filter(g => g.status === 'published').map(g => g.slug),
  )

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
              <span className="text-xs text-gray-400">/</span>
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Guides (Web)</p>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Web guides</h1>
            <p className="text-gray-500 mt-1">Long-form destination guides rendered as web pages. Existing PDF guides are managed separately.</p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <Link href="/admin/settings/about-us" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg">
              <Users className="w-4 h-4" /> About Us
            </Link>
            <Link href="/admin/guides/import" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg">
              <Upload className="w-4 h-4" /> Import guide
            </Link>
            <NewGuideButton />
          </div>
        </div>

        {guides.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-5">No web guides yet. Start your first one.</p>
            <NewGuideButton />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {guides.map(g => {
                const updated = new Date(g.updated_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
                const destCount = g.sections.destinations?.length ?? 0
                const themedCount = g.sections.themedSections?.length ?? 0
                return (
                  <li key={g.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center gap-4 flex-wrap">
                    {g.cover_image ? (
                      <img src={g.cover_image} alt={g.title} className="w-16 h-20 object-cover rounded-md shrink-0 border border-gray-200" />
                    ) : (
                      <div className="w-16 h-20 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300 shrink-0">
                        <Map className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${
                          g.status === 'published'
                            ? 'bg-brand-100 text-brand-800'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {g.status}
                        </span>
                        {g.country && <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{g.country}</span>}
                        {g.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                      <Link href={`/admin/guides/${g.id}/edit`} className="font-bold text-gray-900 hover:text-brand-700">
                        {g.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        /{g.slug} · {destCount} destination{destCount === 1 ? '' : 's'}
                        {themedCount > 0 ? ` · ${themedCount} themed` : ''}
                        {' · updated '}{updated}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {g.status === 'published' && (
                        <Link
                          href={`/guides/${g.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md border border-gray-200 hover:bg-white"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      <Link
                        href={`/admin/guides/${g.id}/edit`}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-3 py-2 rounded-md border border-brand-200 hover:bg-brand-50"
                      >
                        Edit
                      </Link>
                      <DeleteGuideButton id={g.id} title={g.title} status={g.status} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* ── LEGACY PDF GUIDES ── */}
        {legacyGuides.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-gray-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Legacy PDF guides
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Old PDF-based guides from the original seed. Hide any that you've replaced with a web guide. iOS Safari renders these PDFs badly, so superseded ones should be hidden.
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {legacyGuides.map(lg => (
                  <LegacyGuideRow
                    key={lg.id}
                    id={lg.id}
                    slug={lg.slug}
                    name={lg.name}
                    subtitle={lg.subtitle}
                    active={lg.active}
                    supersededByWeb={publishedWebSlugs.has(lg.slug)}
                  />
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
