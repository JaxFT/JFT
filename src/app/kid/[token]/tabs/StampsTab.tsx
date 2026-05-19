import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import PassportPage from '@/components/passport/PassportPage'
import PassportStamp from '@/components/passport/PassportStamp'
import { getPackMeta } from '@/lib/adventurePackData'
import type { StampRow } from '@/lib/passport-kid-db'

type Group = {
  countrySlug: string | null // null = stamps not tied to a country (e.g. BRAVE_TRAVELLER from a flight)
  countryName: string
  flag: string
  stamps: StampRow[]
}

export default function StampsTab({
  token,
  stamps,
}: {
  token: string
  stamps: StampRow[]
}) {
  const groups = groupByCountry(stamps)

  return (
    <PassportPage className="p-6 sm:p-8 min-h-[60vh]">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p
            className="text-xs font-extrabold uppercase tracking-[0.2em]"
            style={{ color: '#5a3a12' }}
          >
            All stamps
          </p>
          <p
            className="text-xs uppercase tracking-widest mt-0.5"
            style={{ color: '#5a3a12', opacity: 0.6 }}
          >
            {stamps.length === 0 ? 'Empty book' : `${stamps.length} ${stamps.length === 1 ? 'stamp' : 'stamps'} across ${groups.length} ${groups.length === 1 ? 'page' : 'pages'}`}
          </p>
        </div>
      </div>

      {stamps.length === 0 ? (
        <div
          className="text-center py-16 text-sm"
          style={{ color: '#5a3a12', opacity: 0.75 }}
        >
          <p className="text-lg font-semibold mb-2">No stamps yet.</p>
          <p className="text-xs uppercase tracking-widest opacity-70 max-w-xs mx-auto leading-relaxed">
            Pick a food, learn a phrase, or finish a mission. Your first stamp will be pressed here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(g => (
            <section key={g.countrySlug ?? 'general'}>
              {/* Country header with flag + name, like a chapter title */}
              <div
                className="flex items-baseline justify-between gap-3 mb-3 pb-2"
                style={{ borderBottom: '1px dashed rgba(120,80,30,0.25)', color: '#5a3a12' }}
              >
                <div className="inline-flex items-center gap-2">
                  <span className="text-xl leading-none" aria-hidden>{g.flag}</span>
                  <h3 className="text-sm font-extrabold uppercase tracking-[0.18em]">{g.countryName}</h3>
                </div>
                {g.countrySlug && (
                  <Link
                    href={`/kid/${token}/country/${g.countrySlug}`}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
                  >
                    Open page <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {/* Cluster of stamps for this country */}
              <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-5">
                {g.stamps.map(s => (
                  <PassportStamp
                    key={s.id}
                    type={s.type}
                    country={g.countryName === '✈️ Travel' ? null : g.countryName}
                    date={s.earned_at}
                    size="md"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PassportPage>
  )
}

function groupByCountry(stamps: StampRow[]): Group[] {
  // Group by country_slug, preserving recency order for the groups by
  // using the most-recent earned_at as the group sort key.
  const byCountry = new Map<string, Group>()
  for (const s of stamps) {
    const key = s.country_slug ?? '__none__'
    const meta = s.country_slug ? getPackMeta(s.country_slug) : null
    if (!byCountry.has(key)) {
      byCountry.set(key, {
        countrySlug: s.country_slug ?? null,
        countryName: meta?.country ?? '✈️ Travel',
        flag: meta?.flag ?? '✈️',
        stamps: [],
      })
    }
    byCountry.get(key)!.stamps.push(s)
  }
  const groups = Array.from(byCountry.values())
  // Most-recent-stamp first inside each group, and most-recently-
  // active country first overall.
  for (const g of groups) {
    g.stamps.sort((a, b) => (a.earned_at < b.earned_at ? 1 : -1))
  }
  groups.sort((a, b) => {
    const aLatest = a.stamps[0]?.earned_at ?? ''
    const bLatest = b.stamps[0]?.earned_at ?? ''
    return aLatest < bLatest ? 1 : -1
  })
  return groups
}
