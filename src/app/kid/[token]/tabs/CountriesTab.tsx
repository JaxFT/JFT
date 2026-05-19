import Link from 'next/link'
import { ArrowRight, Stamp as StampIcon, Trophy, Home } from 'lucide-react'
import PassportPage from '@/components/passport/PassportPage'
import CountryFlag from '@/components/CountryFlag'
import { getPackMeta, getPackByIso2 } from '@/lib/adventurePackMeta'
import { SECTION_KEYS } from '@/lib/adventurePackTypes'
import type {
  CountryVisitRow, StampRow, AssignedPackRow,
} from '@/lib/passport-kid-db'

export default function CountriesTab({
  token,
  visits,
  stamps,
  assignedPacks,
  homeCountryIso2,
}: {
  token: string
  visits: CountryVisitRow[]
  stamps: StampRow[]
  assignedPacks: AssignedPackRow[]
  homeCountryIso2: string | null
}) {
  // Home country may or may not be one of our 35 packs. If it is,
  // its pack slug is how we'll flag visits as "home"; if not, the
  // kid simply won't see a home flag (their home country isn't on
  // the visited list either since there's no pack for it).
  const homePackSlug = homeCountryIso2
    ? (getPackByIso2(homeCountryIso2)?.slug ?? null)
    : null
  // Pre-compute per-country counts so each card can show its own
  // little summary.
  const stampsBySlug = new Map<string, number>()
  for (const s of stamps) {
    if (!s.country_slug) continue
    stampsBySlug.set(s.country_slug, (stampsBySlug.get(s.country_slug) ?? 0) + 1)
  }
  const packsBySlug = new Map<string, AssignedPackRow>()
  for (const p of assignedPacks) packsBySlug.set(p.country_slug, p)

  // Countries the kid has been to (incl. home country).
  const visitedSorted = [...visits].sort(
    (a, b) => (a.first_visit_date < b.first_visit_date ? -1 : 1),
  )

  // Assigned countries the kid hasn't visited yet — the "waiting room".
  const visitedSet = new Set(visits.map(v => v.country_slug))
  const waiting = assignedPacks.filter(p => !visitedSet.has(p.country_slug))

  return (
    <PassportPage className="p-6 sm:p-8" book>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <p
            className="text-xs font-extrabold uppercase tracking-[0.2em]"
            style={{ color: '#5a3a12' }}
          >
            Countries
          </p>
          <p
            className="text-xs uppercase tracking-widest mt-0.5"
            style={{ color: '#5a3a12', opacity: 0.6 }}
          >
            {visits.length === 0
              ? 'None yet'
              : `${visits.length} visited · ${waiting.length} waiting`}
          </p>
        </div>
      </div>

      {visits.length === 0 ? (
        <div
          className="text-center py-16 text-sm"
          style={{ color: '#5a3a12', opacity: 0.75 }}
        >
          <p className="text-lg font-semibold mb-2">Your country pages will live here.</p>
          <p className="text-xs uppercase tracking-widest opacity-70 max-w-xs mx-auto leading-relaxed">
            Open your first Adventure Pack or log a flight to start a country page.
          </p>
        </div>
      ) : (
        <>
          {/* Visited countries — rich cards */}
          <ul className="space-y-3 mb-6">
            {visitedSorted.map(v => {
              const meta = getPackMeta(v.country_slug)
              if (!meta) return null
              const stampCount = stampsBySlug.get(v.country_slug) ?? 0
              const pack = packsBySlug.get(v.country_slug)
              const missionsDone = pack?.missions_complete?.length ?? 0
              const isComplete = !!pack?.completed_at
              const isHome = homePackSlug === v.country_slug
              const formatted = new Date(v.first_visit_date).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })
              return (
                <li key={v.country_slug}>
                  <Link
                    href={`/kid/${token}/country/${v.country_slug}`}
                    className="block bg-white/40 hover:bg-white/60 rounded-xl p-4 transition-colors"
                    style={{ color: '#3a2810' }}
                  >
                    <div className="flex items-center gap-3">
                      <CountryFlag iso2={meta.iso2} country={meta.country} ariaHidden size="2xl" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold inline-flex items-center gap-2">
                          {meta.country}
                          {isHome && (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest bg-amber-900/15 px-1.5 py-0.5 rounded">
                              <Home className="w-2.5 h-2.5" /> Home
                            </span>
                          )}
                        </p>
                        <p className="text-xs opacity-70">First visit · {formatted}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 opacity-50" />
                    </div>

                    {/* Mini stats row */}
                    {(stampCount > 0 || pack) && (
                      <div className="mt-3 pt-3 grid grid-cols-2 gap-3 text-xs" style={{ borderTop: '1px dashed rgba(120,80,30,0.2)' }}>
                        <p className="inline-flex items-center gap-1.5 opacity-80">
                          <StampIcon className="w-3.5 h-3.5" />
                          {stampCount} {stampCount === 1 ? 'stamp' : 'stamps'}
                        </p>
                        {pack && (
                          <p className="inline-flex items-center gap-1.5 opacity-80">
                            <Trophy className="w-3.5 h-3.5" />
                            {isComplete
                              ? 'Pack complete'
                              : `${missionsDone} / ${SECTION_KEYS.length} missions`}
                          </p>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Waiting countries — assigned but not yet visited */}
          {waiting.length > 0 && (
            <section>
              <p
                className="text-xs font-extrabold uppercase tracking-[0.2em] mb-3 pb-2"
                style={{ color: '#5a3a12', borderBottom: '1px dashed rgba(120,80,30,0.25)' }}
              >
                Waiting for you · {waiting.length}
              </p>
              <ul className="space-y-2 opacity-80">
                {waiting.map(p => {
                  const meta = getPackMeta(p.country_slug)
                  if (!meta) return null
                  return (
                    <li
                      key={p.country_slug}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white/20"
                      style={{ color: '#3a2810' }}
                    >
                      <CountryFlag iso2={meta.iso2} country={meta.country} ariaHidden size="lg" />
                      <p className="flex-1 font-semibold">{meta.country}</p>
                      <p className="text-xs opacity-70">Pack ready</p>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </PassportPage>
  )
}
