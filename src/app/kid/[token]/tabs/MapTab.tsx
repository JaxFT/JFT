import PassportPage from '@/components/passport/PassportPage'
import WorldMap from '@/components/passport/WorldMap'
import { getPackMeta } from '@/lib/adventurePackData'
import type { CountryVisitRow } from '@/lib/passport-kid-db'

// Roughly the count of sovereign countries on earth. Used for the
// "X% of the world" stat — we want kids to see how much more there
// is to explore, not that they've already done 100% by unlocking
// our 17 packs.
const WORLD_COUNTRY_COUNT = 195

export default function MapTab({
  token,
  visits,
}: {
  token: string
  visits: CountryVisitRow[]
}) {
  const unlockedSlugs = visits.map(v => v.country_slug)
  const percent = visits.length === 0
    ? 0
    : Math.max(1, Math.round((visits.length / WORLD_COUNTRY_COUNT) * 100))

  return (
    <PassportPage className="p-5 sm:p-8 min-h-[60vh]">
      <div className="mb-4">
        <p
          className="text-xs font-extrabold uppercase tracking-[0.2em]"
          style={{ color: '#5a3a12' }}
        >
          World map
        </p>
        <p
          className="text-xs uppercase tracking-widest mt-0.5"
          style={{ color: '#5a3a12', opacity: 0.6 }}
        >
          {visits.length === 0 ? 'Nothing unlocked yet' : `${visits.length} ${visits.length === 1 ? 'country' : 'countries'} unlocked`}
        </p>
      </div>

      {/* Hero stat: % of the world */}
      <div
        className="flex items-baseline justify-between gap-3 mb-5 pb-4 px-1"
        style={{ borderBottom: '1px dashed rgba(120,80,30,0.25)', color: '#5a3a12' }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">Of the world</p>
          <p className="text-4xl font-extrabold leading-none mt-1">
            {percent}<span className="text-2xl opacity-60">%</span>
          </p>
        </div>
        <p
          className="text-[11px] uppercase tracking-widest text-right max-w-[180px]"
          style={{ opacity: 0.6 }}
        >
          {visits.length === 0
            ? 'Open an Adventure Pack to unlock your first country'
            : `${WORLD_COUNTRY_COUNT - visits.length} countries left to explore`}
        </p>
      </div>

      {/* The map */}
      <WorldMap
        unlockedSlugs={unlockedSlugs}
        hrefForSlug={slug => `/kid/${token}/country/${slug}`}
      />

      {/* Flag legend — handy on mobile where individual countries are tap-tiny */}
      {visits.length > 0 && (
        <div className="mt-6 pt-4" style={{ borderTop: '1px dashed rgba(120,80,30,0.25)' }}>
          <p
            className="text-[11px] uppercase tracking-widest mb-2"
            style={{ color: '#5a3a12', opacity: 0.7 }}
          >
            Tap a country to open its page
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
    </PassportPage>
  )
}
