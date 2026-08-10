import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EyeOff, MapPin, Pencil, Sparkles, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCountryByIso2 } from '@/lib/countries'
import { proxyImageUrl } from '@/lib/image-proxy'
import CountryFlag from '@/components/CountryFlag'
import { TRAVELLER_TYPES, type TravellerTypeId } from '@/app/what-kind-of-traveller-are-you/quiz-data'
import { BACKGROUND_THEMES, isValidBackgroundTheme } from '@/app/travel-profile/background-themes'

export const dynamic = 'force-dynamic'

function isValidTravellerType(v: string | null): v is TravellerTypeId {
  return !!v && v in TRAVELLER_TYPES
}

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> },
): Promise<Metadata> {
  const { username } = await params
  return { title: `${username}'s Travel Profile` }
}

export default async function TravelProfilePublicPage(
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .eq('username', username)
    .maybeSingle()
  if (!profile) notFound()

  const { data: { user: viewer } } = await supabase.auth.getUser()
  const isOwner = viewer?.id === profile.id

  const [{ data: travelProfile }, { data: places }, { data: buddies }] = await Promise.all([
    supabase.from('travel_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
    supabase.from('travel_profile_places').select('iso2, list_type, top8_rank').eq('user_id', profile.id),
    supabase.from('travel_profile_buddies').select('id, name').eq('user_id', profile.id).order('created_at'),
  ])

  if (!travelProfile?.is_public && !isOwner) notFound()

  const been = (places ?? []).filter(p => p.list_type === 'been')
  const want = (places ?? []).filter(p => p.list_type === 'want')
  const top8 = been.filter(p => p.top8_rank != null).sort((a, b) => (a.top8_rank ?? 0) - (b.top8_rank ?? 0))

  const favourites: Array<{ emoji: string; label: string; value: string | null }> = [
    { emoji: '❤️', label: 'Favourite place', value: travelProfile?.fav_place ?? null },
    { emoji: '🍜', label: 'Favourite food', value: travelProfile?.fav_food ?? null },
    { emoji: '🏖️', label: 'Favourite beach', value: travelProfile?.fav_beach ?? null },
    { emoji: '🏊', label: 'Favourite swim', value: travelProfile?.fav_swim ?? null },
    { emoji: '🥾', label: 'Favourite adventure', value: travelProfile?.fav_adventure ?? null },
    { emoji: '🌅', label: 'Favourite sunset', value: travelProfile?.fav_sunset ?? null },
  ].filter(f => f.value)

  const favCountry = travelProfile?.fav_country_iso2 ? getCountryByIso2(travelProfile.fav_country_iso2) : null
  const rawTheme: unknown = travelProfile?.background_theme
  const heroTheme = BACKGROUND_THEMES[isValidBackgroundTheme(rawTheme) ? rawTheme : 'brand']
  const focalPosition = `${travelProfile?.hero_photo_focal_x ?? 50}% ${travelProfile?.hero_photo_focal_y ?? 50}%`

  return (
    <div className="min-h-screen bg-sand-50 pt-20 pb-20">
      {isOwner && !travelProfile?.is_public && (
        <div className="bg-amber-50 border-b border-amber-100 text-amber-800 text-sm text-center py-2.5 px-4">
          <EyeOff className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Only you can see this right now.{' '}
          <Link href="/travel-profile" className="underline font-semibold">Make it public</Link>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6">
        {isOwner && (
          <Link
            href="/travel-profile"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline mb-4"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit your page
          </Link>
        )}

        {/* Hero photo */}
        <div
          className="rounded-3xl overflow-hidden aspect-[4/3] mb-6 flex items-center justify-center"
          style={{ background: heroTheme.gradient }}
        >
          {travelProfile?.hero_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxyImageUrl(travelProfile.hero_photo_url)}
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition: focalPosition }}
            />
          ) : (
            <span className="text-white/60 text-sm font-semibold">No photo yet</span>
          )}
        </div>

        {/* Identity */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile.full_name || profile.username}</h1>
          {travelProfile?.bio && <p className="text-gray-600 mb-2">{travelProfile.bio}</p>}
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 flex-wrap">
            {travelProfile?.current_location && (
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {travelProfile.current_location}</span>
            )}
            <span>{been.length} {been.length === 1 ? 'country' : 'countries'} visited</span>
          </div>
          {isValidTravellerType(travelProfile?.traveller_type ?? null) && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5 mt-3">
              <Sparkles className="w-3 h-3" /> {TRAVELLER_TYPES[travelProfile!.traveller_type as TravellerTypeId].name}
            </span>
          )}
        </div>

        {/* Favourite country */}
        {favCountry && (
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 mb-8 text-center">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">🏆 Favourite country</p>
            <p className="inline-flex items-center gap-2 text-lg font-bold text-gray-900">
              <CountryFlag iso2={favCountry.iso2} country={favCountry.name} ariaHidden size="md" /> {favCountry.name}
            </p>
            {travelProfile?.fav_country_why && (
              <p className="text-sm text-gray-600 mt-1.5 italic">&quot;{travelProfile.fav_country_why}&quot;</p>
            )}
          </div>
        )}

        {/* My Travel 8 */}
        {top8.length > 0 && (
          <Section title="My Travel 8">
            <ol className="grid grid-cols-2 gap-2">
              {top8.map(p => {
                const country = getCountryByIso2(p.iso2)
                return (
                  <li key={p.iso2} className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-3 py-2">
                    <span className="text-xs font-bold text-gray-400 w-4">{p.top8_rank}</span>
                    <CountryFlag iso2={p.iso2} country={country?.name} ariaHidden size="sm" />
                    <span className="text-sm font-medium text-gray-800 truncate">{country?.name ?? p.iso2.toUpperCase()}</span>
                  </li>
                )
              })}
            </ol>
          </Section>
        )}

        {/* Been */}
        {been.length > 0 && (
          <Section title="I've been">
            <div className="flex flex-wrap gap-2">
              {been.map(p => {
                const country = getCountryByIso2(p.iso2)
                return (
                  <span key={p.iso2} className="inline-flex items-center gap-1.5 bg-white border border-gray-100 rounded-full pl-2 pr-3 py-1 text-sm font-medium text-gray-800">
                    <CountryFlag iso2={p.iso2} country={country?.name} ariaHidden size="sm" />
                    {country?.name ?? p.iso2.toUpperCase()}
                  </span>
                )
              })}
            </div>
          </Section>
        )}

        {/* Want to go */}
        {want.length > 0 && (
          <Section title="I want to go">
            <div className="flex flex-wrap gap-2">
              {want.map(p => {
                const country = getCountryByIso2(p.iso2)
                return (
                  <span key={p.iso2} className="inline-flex items-center gap-1.5 bg-white border border-dashed border-gray-200 rounded-full pl-2 pr-3 py-1 text-sm font-medium text-gray-600">
                    <CountryFlag iso2={p.iso2} country={country?.name} ariaHidden size="sm" />
                    {country?.name ?? p.iso2.toUpperCase()}
                  </span>
                )
              })}
            </div>
          </Section>
        )}

        {/* Favourites */}
        {favourites.length > 0 && (
          <Section title="Favourites">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {favourites.map(f => (
                <div key={f.label} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-400">{f.emoji} {f.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{f.value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Travel buddies */}
        {(buddies ?? []).length > 0 && (
          <Section title="Travel buddies" icon={<Users className="w-4 h-4" />}>
            <div className="flex flex-wrap gap-2">
              {buddies!.map(b => (
                <span key={b.id} className="inline-flex items-center gap-1 bg-white border border-gray-100 rounded-full px-3 py-1.5 text-sm font-medium text-gray-800">
                  👤 {b.name}
                </span>
              ))}
            </div>
          </Section>
        )}

        {been.length === 0 && want.length === 0 && favourites.length === 0 && !favCountry && !(buddies ?? []).length && (
          <p className="text-center text-sm text-gray-400 italic mt-10">
            {isOwner ? "You haven't added anything yet." : `${profile.full_name || profile.username} hasn't added anything yet.`}
          </p>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3 flex items-center gap-1.5">
        {icon}{title}
      </p>
      {children}
    </div>
  )
}
