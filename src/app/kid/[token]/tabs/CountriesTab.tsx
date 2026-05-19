import PassportPage from '@/components/passport/PassportPage'
import { getPackMeta } from '@/lib/adventurePackData'
import type { CountryVisitRow } from '@/lib/passport-kid-db'

export default function CountriesTab({ visits }: { visits: CountryVisitRow[] }) {
  return (
    <PassportPage className="p-6 sm:p-8 min-h-[60vh]">
      <p
        className="text-xs font-extrabold uppercase tracking-[0.2em] mb-1"
        style={{ color: '#5a3a12' }}
      >
        Countries
      </p>
      <p
        className="text-xs uppercase tracking-widest mb-6"
        style={{ color: '#5a3a12', opacity: 0.6 }}
      >
        {visits.length === 0 ? 'None yet' : `${visits.length} pages`}
      </p>

      {visits.length === 0 ? (
        <div
          className="text-center py-16 text-sm"
          style={{ color: '#5a3a12', opacity: 0.75 }}
        >
          <p className="text-lg font-semibold mb-2">Your country pages will live here.</p>
          <p className="text-xs uppercase tracking-widest opacity-70 max-w-xs mx-auto leading-relaxed">
            Open your first Adventure Pack to start a country page.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visits.map(v => {
            const meta = getPackMeta(v.country_slug)
            if (!meta) return null
            const formatted = new Date(v.first_visit_date).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })
            return (
              <li
                key={v.country_slug}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white/30"
                style={{ color: '#3a2810' }}
              >
                <span className="text-3xl leading-none" aria-hidden>{meta.flag}</span>
                <div className="flex-1">
                  <p className="font-semibold">{meta.country}</p>
                  <p className="text-xs opacity-70">First visit · {formatted}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </PassportPage>
  )
}
