import Link from 'next/link'
import type { Metadata } from 'next'
import { Compass, MapPin, Search, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { proxyImageUrl } from '@/lib/image-proxy'
import { TRAVELLER_TYPES, type TravellerTypeId } from '@/app/what-kind-of-traveller-are-you/quiz-data'
import { BACKGROUND_THEMES, isValidBackgroundTheme } from '@/app/travel-profile/background-themes'

export const metadata: Metadata = { title: 'Discover Travellers' }
export const dynamic = 'force-dynamic'

function isValidTravellerType(v: string | null): v is TravellerTypeId {
  return !!v && v in TRAVELLER_TYPES
}

// Automatic — going public on /travel-profile is what gets you listed
// here, no separate "discoverable" toggle. Fetch-then-filter-in-memory
// rather than a cross-RLS search query: profiles is locked down by RLS
// (see travel-profile-db.ts), and at the site's current scale this is
// simpler and plenty fast. Worth revisiting with real search infra if
// the directory ever gets big.
const FETCH_LIMIT = 200
const DISPLAY_LIMIT = 60

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim().toLowerCase()

  const supabase = await createClient()
  const { data: publicProfiles } = await supabase
    .from('travel_profiles')
    .select('user_id, hero_photo_url, hero_photo_focal_x, hero_photo_focal_y, background_theme, current_location, traveller_type')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(FETCH_LIMIT)

  const ids = (publicProfiles ?? []).map(p => p.user_id)
  const nameById = await getPublicProfilesByIds(ids)

  let people = (publicProfiles ?? [])
    .map(tp => {
      const p = nameById.get(tp.user_id)
      return { ...tp, username: p?.username ?? null, full_name: p?.full_name ?? null }
    })
    .filter(p => p.username || p.full_name)

  if (query) {
    people = people.filter(p =>
      (p.full_name ?? '').toLowerCase().includes(query)
      || (p.username ?? '').toLowerCase().includes(query)
      || (p.current_location ?? '').toLowerCase().includes(query),
    )
  }
  people = people.slice(0, DISPLAY_LIMIT)

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-2">
          <Compass className="w-5 h-5 text-brand-600" />
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600">Discover</p>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Travellers</h1>
        <p className="text-gray-500 mb-6">Public Travel Profiles from the JFT community.</p>

        <form method="GET" className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name, username, or location…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>

        {people.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            {query ? `No travellers match "${q}".` : 'No public Travel Profiles yet, be the first.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map(p => {
              const rawTheme: unknown = p.background_theme
              const theme = BACKGROUND_THEMES[isValidBackgroundTheme(rawTheme) ? rawTheme : 'brand']
              const focal = `${p.hero_photo_focal_x ?? 50}% ${p.hero_photo_focal_y ?? 50}%`
              return (
                <Link
                  key={p.user_id}
                  href={`/u/${p.username}`}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-brand-200 hover:shadow-md transition-all"
                >
                  <div className="aspect-[4/3] flex items-center justify-center" style={{ background: theme.gradient }}>
                    {p.hero_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxyImageUrl(p.hero_photo_url)}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: focal }}
                      />
                    ) : (
                      <span className="text-white text-3xl font-bold">
                        {(p.full_name || p.username || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-gray-900 group-hover:text-brand-700 truncate">{p.full_name || p.username}</p>
                    {p.current_location && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {p.current_location}
                      </p>
                    )}
                    {isValidTravellerType(p.traveller_type) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 rounded-full px-2 py-1 mt-2">
                        <Sparkles className="w-3 h-3" /> {TRAVELLER_TYPES[p.traveller_type].name}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
