import PassportPage from '@/components/passport/PassportPage'
import { getPackMeta } from '@/lib/adventurePackData'
import type { CountryVisitRow } from '@/lib/passport-kid-db'

export default function MapTab({ visits }: { visits: CountryVisitRow[] }) {
  return (
    <PassportPage className="p-6 sm:p-8 min-h-[60vh]">
      <p
        className="text-xs font-extrabold uppercase tracking-[0.2em] mb-1"
        style={{ color: '#5a3a12' }}
      >
        World map
      </p>
      <p
        className="text-xs uppercase tracking-widest mb-6"
        style={{ color: '#5a3a12', opacity: 0.6 }}
      >
        {visits.length === 0 ? 'No countries unlocked yet' : `${visits.length} unlocked`}
      </p>

      {/* Quick country-flag list for v1. The SVG world map lands in
          the country-pages + map phase. */}
      {visits.length === 0 ? (
        <div
          className="text-center py-16 text-sm"
          style={{ color: '#5a3a12', opacity: 0.75 }}
        >
          <p className="text-lg font-semibold mb-2">No countries yet.</p>
          <p className="text-xs uppercase tracking-widest opacity-70 max-w-xs mx-auto leading-relaxed">
            Open an Adventure Pack to unlock your first country.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {visits.map(v => {
            const meta = getPackMeta(v.country_slug)
            if (!meta) return null
            return (
              <div
                key={v.country_slug}
                className="text-center"
                style={{ color: '#3a2810' }}
              >
                <div className="text-5xl leading-none mb-1" aria-hidden>{meta.flag}</div>
                <p className="text-xs font-semibold uppercase tracking-widest">{meta.country}</p>
              </div>
            )
          })}
        </div>
      )}
    </PassportPage>
  )
}
