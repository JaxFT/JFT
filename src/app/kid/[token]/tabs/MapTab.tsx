import PassportPage from '@/components/passport/PassportPage'
import WorldMap from '@/components/passport/WorldMap'
import CountryFlag from '@/components/CountryFlag'
import { getPackMeta, getPackByIso2 } from '@/lib/adventurePackMeta'
import { getCountryByIso2 } from '@/lib/countries'
import type { CountryVisitRow } from '@/lib/passport-kid-db'

// Roughly the count of sovereign countries on earth — denominator for
// the "X% of the world" stat.
const WORLD_COUNTRY_COUNT = 195

export default function MapTab({
  token,
  visits,
  homeCountryIso2,
}: {
  token: string
  visits: CountryVisitRow[]
  homeCountryIso2: string | null
}) {
  // Map highlight currently keys off pack slugs; non-pack visits
  // appear only in the chip strip below until the map gains ISO
  // support. Phase D follow-up.
  const unlockedSlugs = visits
    .map(v => getPackByIso2(v.iso2)?.slug)
    .filter((s): s is string => !!s)
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
        homeCountryIso2={homeCountryIso2}
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
              const pack = getPackByIso2(v.iso2)
              const country = getCountryByIso2(v.iso2)
              const name = pack?.country ?? country?.name
              if (!name) return null
              const href = pack ? `/kid/${token}/country/${pack.slug}` : undefined
              const chipClass = "inline-flex items-center gap-1.5 bg-white/40 rounded-full px-2 py-1 text-xs"
              const inner = (
                <>
                  <CountryFlag iso2={v.iso2} country={name} ariaHidden size="sm" />
                  <span className="font-semibold">{name}</span>
                </>
              )
              return href
                ? <a key={v.iso2} href={href} className={`${chipClass} hover:bg-white/60`} style={{ color: '#3a2810' }}>{inner}</a>
                : <span key={v.iso2} className={chipClass} style={{ color: '#3a2810' }} title="Pack not available yet">{inner}</span>
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
