import PassportPage from '@/components/passport/PassportPage'
import WorldMap from '@/components/passport/WorldMap'
import { getPackMeta } from '@/lib/adventurePackData'
import type { CountryVisitRow } from '@/lib/passport-kid-db'

// Roughly the count of sovereign countries on earth — denominator for
// the "X% of the world" stat.
const WORLD_COUNTRY_COUNT = 195

export default function MapTab({
  token,
  visits,
  homeCountrySlug,
}: {
  token: string
  visits: CountryVisitRow[]
  homeCountrySlug: string | null
}) {
  const unlockedSlugs = visits.map(v => v.country_slug)
  const percent = visits.length === 0
    ? 0
    : Math.max(1, Math.round((visits.length / WORLD_COUNTRY_COUNT) * 100))

  return (
    <PassportPage className="p-4 sm:p-5">
      {/* Compact header strip — pushes the map to dominate. */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-baseline gap-3 flex-wrap">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.2em]"
            style={{ color: '#5a3a12' }}
          >
            World map
          </p>
          <p className="text-xs uppercase tracking-widest" style={{ color: '#5a3a12', opacity: 0.6 }}>
            {visits.length === 0 ? 'Nothing unlocked' : `${visits.length} unlocked`}
          </p>
        </div>
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: '#5a3a12', opacity: 0.85 }}
        >
          <span className="font-extrabold text-lg" style={{ color: '#3a2810' }}>{percent}%</span>{' '}
          of the world
        </p>
      </div>

      {/* The big interactive map */}
      <WorldMap
        unlockedSlugs={unlockedSlugs}
        hrefForSlug={slug => `/kid/${token}/country/${slug}`}
        homeCountrySlug={homeCountrySlug}
      />

      {/* Compact flag chip strip below — tap to open a country, mainly
          useful on mobile where small countries are hard to tap on the
          zoomed-out map. */}
      {visits.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px dashed rgba(120,80,30,0.25)' }}>
          <p
            className="text-[11px] uppercase tracking-widest mb-2"
            style={{ color: '#5a3a12', opacity: 0.7 }}
          >
            Tap to open a country
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visits.map(v => {
              const meta = getPackMeta(v.country_slug)
              if (!meta) return null
              return (
                <a
                  key={v.country_slug}
                  href={`/kid/${token}/country/${v.country_slug}`}
                  className="inline-flex items-center gap-1.5 bg-white/40 hover:bg-white/60 rounded-full px-2 py-1 text-xs"
                  style={{ color: '#3a2810' }}
                >
                  <span className="text-base leading-none">{meta.flag}</span>
                  <span className="font-semibold">{meta.country}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {visits.length === 0 && (
        <p
          className="text-center text-xs uppercase tracking-widest mt-4"
          style={{ color: '#5a3a12', opacity: 0.7 }}
        >
          Open an Adventure Pack or log a flight to unlock your first country
        </p>
      )}
    </PassportPage>
  )
}
