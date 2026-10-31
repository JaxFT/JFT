import Link from 'next/link'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ShieldCheck, BarChart3, ThumbsUp, MessageCircle, MapPin, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { getSocialCounts } from '@/lib/recommendation-social'
import { getCountryByIso2 } from '@/lib/countries'
import { shortName } from '@/lib/display-name'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'Admin · Recommendations stats',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Cloudflare Web Analytics already tracks visits to every page
// (including /recommendations itself), same source LiveTrafficAdminCard
// links out to on /account — no reason to build a second, parallel
// page-view counter here. This page surfaces the engagement data that
// ISN'T in Cloudflare: what people do once they're looking at
// Recommendations (votes, comments, coverage), aggregated in memory
// same as everywhere else at this site's scale (see getSocialCounts).
const CF_DASHBOARD_URL = 'https://dash.cloudflare.com/d8da36f93ce355293addf1f155b2afd6/dashboards/26b69e55-309a-491e-990c-412640545611'

type RecRow = {
  id: string
  category: 'food' | 'attraction'
  place_name: string
  iso2: string
  town: string
  google_maps_url: string | null
  user_id: string
  created_at: string
}

export default async function RecommendationsStatsPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('recommendations')
    .select('id, category, place_name, iso2, town, google_maps_url, user_id, created_at')
    .order('created_at', { ascending: false })

  const items = (rows ?? []) as RecRow[]
  const ids = items.map(r => r.id)
  const authorIds = [...new Set(items.map(r => r.user_id))]

  const [counts, authors] = await Promise.all([
    getSocialCounts(supabase, ids, null),
    getPublicProfilesByIds(authorIds),
  ])

  const authorName = (userId: string) => {
    const p = authors.get(userId)
    return shortName(p?.full_name) || p?.username || 'Unknown'
  }

  const total = items.length
  const foodCount = items.filter(r => r.category === 'food').length
  const attractionCount = total - foodCount
  const missingMapsLink = items.filter(r => !r.google_maps_url).length
  const totalVotes = ids.reduce((sum, id) => sum + (counts.get(id)?.up_votes ?? 0) + (counts.get(id)?.down_votes ?? 0), 0)
  const totalComments = ids.reduce((sum, id) => sum + (counts.get(id)?.comment_count ?? 0), 0)

  const byCountry = new Map<string, number>()
  for (const r of items) byCountry.set(r.iso2, (byCountry.get(r.iso2) ?? 0) + 1)
  const topCountries = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

  const topUpvoted = [...items]
    .sort((a, b) => (counts.get(b.id)?.up_votes ?? 0) - (counts.get(a.id)?.up_votes ?? 0))
    .filter(r => (counts.get(r.id)?.up_votes ?? 0) > 0)
    .slice(0, 8)

  const topCommented = [...items]
    .sort((a, b) => (counts.get(b.id)?.comment_count ?? 0) - (counts.get(a.id)?.comment_count ?? 0))
    .filter(r => (counts.get(r.id)?.comment_count ?? 0) > 0)
    .slice(0, 8)

  const recent = items.slice(0, 10)

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
          <span className="text-xs text-gray-400">/</span>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Recommendations stats</p>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-7 h-7 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900">Recommendations stats</h1>
        </div>
        <p className="text-gray-500 mb-4 leading-relaxed">
          Engagement across the Recommendations directory: votes, comments and coverage. For how many people are actually
          visiting the page, that's Cloudflare Web Analytics, not this — same dashboard the traffic card on /account links to.
        </p>
        <a
          href={CF_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline mb-8"
        >
          Open Cloudflare Web Analytics <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total places', value: total },
            { label: 'Food / Attractions', value: `${foodCount} / ${attractionCount}` },
            { label: 'Missing Maps link', value: missingMapsLink },
            { label: 'Votes / Comments', value: `${totalVotes} / ${totalComments}` },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {missingMapsLink > 0 && (
          <Link
            href="/admin/resolve-maps-links"
            className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-lg px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-100 transition-colors mb-8"
          >
            <MapPin className="w-4 h-4" /> {missingMapsLink} place{missingMapsLink === 1 ? '' : 's'} still missing a Maps link — resolve them
          </Link>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <Section title="Top countries" icon={<MapPin className="w-4 h-4" />}>
            {topCountries.length === 0 ? (
              <Empty />
            ) : (
              topCountries.map(([iso2, count]) => (
                <Row key={iso2} label={getCountryByIso2(iso2)?.name ?? iso2.toUpperCase()} value={count} />
              ))
            )}
          </Section>

          <Section title="Most upvoted" icon={<ThumbsUp className="w-4 h-4" />}>
            {topUpvoted.length === 0 ? (
              <Empty />
            ) : (
              topUpvoted.map(r => (
                <Row key={r.id} label={r.place_name} value={counts.get(r.id)?.up_votes ?? 0} />
              ))
            )}
          </Section>

          <Section title="Most commented" icon={<MessageCircle className="w-4 h-4" />}>
            {topCommented.length === 0 ? (
              <Empty />
            ) : (
              topCommented.map(r => (
                <Row key={r.id} label={r.place_name} value={counts.get(r.id)?.comment_count ?? 0} />
              ))
            )}
          </Section>

          <Section title="Recently added" icon={<BarChart3 className="w-4 h-4" />}>
            {recent.length === 0 ? (
              <Empty />
            ) : (
              recent.map(r => (
                <Row key={r.id} label={r.place_name} value={authorName(r.user_id)} />
              ))
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-brand-600">{icon}</span>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <p className="text-gray-700 truncate">{label}</p>
      <p className="text-gray-400 font-semibold shrink-0">{value}</p>
    </div>
  )
}

function Empty() {
  return <p className="text-xs text-gray-400 italic">Nothing yet.</p>
}
