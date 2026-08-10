import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Compass, EyeOff, Instagram, Link2, MapPin, Pencil, Sparkles, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCountryByIso2 } from '@/lib/countries'
import { proxyImageUrl } from '@/lib/image-proxy'
import CountryFlag from '@/components/CountryFlag'
import { getPublicProfileByUsername, getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { TRAVELLER_TYPES, type TravellerTypeId } from '@/app/what-kind-of-traveller-are-you/quiz-data'
import { BACKGROUND_THEMES, isValidBackgroundTheme } from '@/app/travel-profile/background-themes'

export const dynamic = 'force-dynamic'

function isValidTravellerType(v: string | null): v is TravellerTypeId {
  return !!v && v in TRAVELLER_TYPES
}

// Fallback label when no custom link_label is set: the bare hostname,
// "www." stripped, e.g. "waystaq.com".
function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
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

  // profiles is locked down by RLS to the owner only, looking this up
  // with the normal cookie-bound client would return null for every
  // visitor except the profile's own owner. Service-role read, same
  // pattern as blog comment authors, see travel-profile-db.ts.
  const profile = await getPublicProfileByUsername(username)
  if (!profile) notFound()

  const supabase = await createClient()
  const { data: { user: viewer } } = await supabase.auth.getUser()
  const isOwner = viewer?.id === profile.id

  const [{ data: travelProfile }, { data: places }, { data: buddyRows }] = await Promise.all([
    supabase.from('travel_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
    supabase.from('travel_profile_places').select('iso2, list_type, top8_rank').eq('user_id', profile.id),
    supabase.from('travel_profile_buddies').select('id, buddy_user_id').eq('user_id', profile.id).order('created_at'),
  ])

  type Buddy = { id: string; username: string | null; full_name: string | null }
  const buddyIds = (buddyRows ?? []).map(b => b.buddy_user_id).filter((id): id is string => !!id)
  const buddyProfiles = await getPublicProfilesByIds(buddyIds)
  const buddies: Buddy[] = (buddyRows ?? []).flatMap(b => {
    if (!b.buddy_user_id) return []
    const p = buddyProfiles.get(b.buddy_user_id)
    if (!p || (!p.username && !p.full_name)) return []
    return [{ id: b.id, username: p.username, full_name: p.full_name }]
  })

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
    <div className="min-h-screen pb-20" style={{ background: heroTheme.gradient }}>
      {isOwner && !travelProfile?.is_public && (
        <div className="bg-amber-50 border-b border-amber-100 text-amber-800 text-sm text-center py-2.5 px-4 mt-16">
          <EyeOff className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Only you can see this right now.{' '}
          <Link href="/travel-profile" className="underline font-semibold">Make it public</Link>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24">
        {isOwner && (
          <Link
            href="/travel-profile"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm px-3 py-1.5 rounded-full mb-4"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit your page
          </Link>
        )}

        {/* Hero photo */}
        <div className="rounded-3xl overflow-hidden aspect-[4/3] mb-6 flex items-center justify-center bg-white/10 border border-white/15">
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
        <div className="bg-white rounded-2xl px-6 py-6 text-center mb-6 shadow-lg shadow-black/5">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile.full_name || profile.username}</h1>
          {travelProfile?.bio && <p className="text-gray-600 mb-2">{travelProfile.bio}</p>}
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 flex-wrap">
            {travelProfile?.current_location && (
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {travelProfile.current_location}</span>
            )}
            <span>{been.length} {been.length === 1 ? 'country' : 'countries'} visited</span>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap mt-3">
            {isValidTravellerType(travelProfile?.traveller_type ?? null) && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5">
                <Sparkles className="w-3 h-3" /> {TRAVELLER_TYPES[travelProfile!.traveller_type as TravellerTypeId].name}
              </span>
            )}
            {travelProfile?.instagram_handle && (
              <a
                href={`https://instagram.com/${travelProfile.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-br from-purple-600 to-pink-500 rounded-full px-3 py-1.5 hover:opacity-90"
              >
                <Instagram className="w-3 h-3" /> @{travelProfile.instagram_handle}
              </a>
            )}
            {travelProfile?.link_url && (
              <a
                href={travelProfile.link_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-100"
              >
                <Link2 className="w-3 h-3" /> {travelProfile.link_label || hostnameLabel(travelProfile.link_url)}
              </a>
            )}
          </div>
        </div>

        {/* Favourite country */}
        {favCountry && (
          <div className="bg-white rounded-2xl px-5 py-4 mb-6 text-center shadow-lg shadow-black/5">
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
                  <li key={p.iso2} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
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
                  <span key={p.iso2} className="inline-flex items-center gap-1.5 bg-white rounded-full pl-2 pr-3 py-1 text-sm font-medium text-gray-800">
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
                  <span key={p.iso2} className="inline-flex items-center gap-1.5 bg-white/80 border border-dashed border-white rounded-full pl-2 pr-3 py-1 text-sm font-medium text-gray-700">
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
                <div key={f.label} className="bg-white rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">{f.emoji} {f.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{f.value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Travel buddies — real accounts only, each links to their own page */}
        {buddies.length > 0 && (
          <Section title="Travel buddies" icon={<Users className="w-4 h-4" />}>
            <div className="flex flex-wrap gap-2">
              {buddies.map(b => {
                const label = b.full_name || b.username
                const content = <>👤 {label}</>
                return b.username ? (
                  <Link
                    key={b.id}
                    href={`/u/${b.username}`}
                    className="inline-flex items-center gap-1 bg-white rounded-full px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                  >
                    {content}
                  </Link>
                ) : (
                  <span key={b.id} className="inline-flex items-center gap-1 bg-white rounded-full px-3 py-1.5 text-sm font-medium text-gray-800">
                    {content}
                  </span>
                )
              })}
            </div>
          </Section>
        )}

        {been.length === 0 && want.length === 0 && favourites.length === 0 && !favCountry && buddies.length === 0 && (
          <p className="text-center text-sm text-white/70 italic mt-10">
            {isOwner ? "You haven't added anything yet." : `${profile.full_name || profile.username} hasn't added anything yet.`}
          </p>
        )}

        <div className="text-center mt-10">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white"
          >
            <Compass className="w-3.5 h-3.5" /> Real Travellers
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold tracking-widest uppercase text-white/80 mb-3 flex items-center gap-1.5">
        {icon}{title}
      </p>
      {children}
    </div>
  )
}
