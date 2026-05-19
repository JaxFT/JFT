import PassportPage from '@/components/passport/PassportPage'
import WorldMap from '@/components/passport/WorldMap'
import { getPackMeta } from '@/lib/adventurePackData'
import type { CountryVisitRow } from '@/lib/passport-kid-db'

export default function MapTab({
  token,
  visits,
}: {
  token: string
  visits: CountryVisitRow[]
}) {
  const unlockedSlugs = visits.map(v => v.country_slug)

  return (
    <PassportPage className="p-5 sm:p-6 min-h-[60vh]">
      <div className="flex items-baseline justify-between mb-4">
        <p
          className="text-xs font-extrabold uppercase tracking-[0.2em]"
          style={{ color: '#5a3a12' }}
        >
          World map
        </p>
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: '#5a3a12', opacity: 0.6 }}
        >
          {visits.length === 0 ? 'Nothing unlocked yet' : `${visits.length} unlocked`}
        </p>
      </div>

      <WorldMap
        unlockedSlugs={unlockedSlugs}
        hrefForSlug={slug => `/kid/${token}/country/${slug}`}
      />

      {/* Quick flag legend below — handy on mobile where the map is small */}
      {visits.length > 0 && (
        <div className="mt-5 pt-4 border-t border-amber-900/10">
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
          className="text-center text-xs uppercase tracking-widest mt-6"
          style={{ color: '#5a3a12', opacity: 0.7 }}
        >
          Open an Adventure Pack to unlock your first country
        </p>
      )}
    </PassportPage>
  )
}
