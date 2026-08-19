import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown, EyeOff, Globe2, Instagram, Link2, MapPin, PlaneTakeoff, Pencil, Sparkles, UtensilsCrossed, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCountryByIso2 } from '@/lib/countries'
import { proxyImageUrl } from '@/lib/image-proxy'
import CountryFlag from '@/components/CountryFlag'
import { getPublicProfileByUsername, getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { TRAVELLER_TYPES, type TravellerTypeId } from '@/app/what-kind-of-traveller-are-you/quiz-data'
import { BACKGROUND_THEMES, isValidBackgroundTheme } from '@/app/travel-profile/background-themes'
import { shortName } from '@/lib/display-name'
import GuestbookSection, { type GuestbookEntry } from './GuestbookSection'
import AddBuddyButton from './AddBuddyButton'

const GUESTBOOK_PAGE_SIZE = 20

// Roughly the count of sovereign countries on earth — denominator for
// the "X% of the world" stat, same number and formula the kids'
// passport world map uses (src/app/kid/[token]/tabs/MapTab.tsx), so
// the figure means the same thing in both places.
const WORLD_COUNTRY_COUNT = 195

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

  const [{ data: travelProfile }, { data: places }, { data: buddyRows }, { data: guestbookRows }, viewerAlreadyBuddy] = await Promise.all([
    supabase.from('travel_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
    supabase.from('travel_profile_places').select('iso2, list_type, top8_rank').eq('user_id', profile.id),
    supabase.from('travel_profile_buddies').select('id, buddy_user_id').eq('user_id', profile.id).order('created_at'),
    supabase.from('travel_profile_guestbook')
      .select('id, profile_user_id, author_user_id, body, created_at')
      .eq('profile_user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(GUESTBOOK_PAGE_SIZE),
    viewer && !isOwner
      ? supabase.from('travel_profile_buddies').select('id').eq('user_id', viewer.id).eq('buddy_user_id', profile.id).maybeSingle().then(r => !!r.data)
      : Promise.resolve(false),
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

  const guestbookRowsSafe = guestbookRows ?? []
  const guestbookAuthors = await getPublicProfilesByIds([...new Set(guestbookRowsSafe.map(g => g.author_user_id))])
  const guestbookEntries: GuestbookEntry[] = guestbookRowsSafe.map(g => ({
    ...g,
    author: guestbookAuthors.get(g.author_user_id) ?? null,
  }))
  const guestbookHasMore = guestbookRowsSafe.length === GUESTBOOK_PAGE_SIZE

  const been = (places ?? []).filter(p => p.list_type === 'been')
  const want = (places ?? []).filter(p => p.list_type === 'want')
  const top8 = been.filter(p => p.top8_rank != null).sort((a, b) => (a.top8_rank ?? 0) - (b.top8_rank ?? 0))
  const worldPercent = been.length === 0 ? 0 : Math.max(1, Math.round((been.length / WORLD_COUNTRY_COUNT) * 100))

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
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{shortName(profile.full_name) || profile.username}</h1>
          {travelProfile?.bio && <p className="text-gray-600 mb-2">{travelProfile.bio}</p>}
          {(travelProfile?.mood || travelProfile?.currently_vibing_to) && (
            <p className="text-sm text-gray-500 mb-2 flex items-center justify-center gap-3 flex-wrap">
              {travelProfile.mood && <span>{travelProfile.mood}</span>}
              {travelProfile.currently_vibing_to && <span>🎧 {travelProfile.currently_vibing_to}</span>}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 flex-wrap">
            {travelProfile?.current_location && (
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {travelProfile.current_location}</span>
            )}
            <span>{been.length} {been.length === 1 ? 'country' : 'countries'} visited</span>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap mt-3">
            {been.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-br from-brand-600 to-brand-800 rounded-full px-3 py-1.5">
                <Globe2 className="w-3 h-3" /> {worldPercent}% of the world
              </span>
            )}
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
            <Link
              href={`/recommendations?user=${profile.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5 hover:bg-brand-100"
            >
              <UtensilsCrossed className="w-3 h-3" /> Recommendations
            </Link>
            {viewer && !isOwner && (
              <AddBuddyButton targetUserId={profile.id} initialAdded={viewerAlreadyBuddy} />
            )}
          </div>
        </div>

        {/* Currently planning — a status nudge, doubles as a prompt for
            guestbook visitors to leave trip tips below. */}
        {travelProfile?.currently_planning && (
          <div className="bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4 mb-6 text-center">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1.5 flex items-center justify-center gap-1.5">
              <PlaneTakeoff className="w-3.5 h-3.5" /> Currently planning
            </p>
            <p className="text-lg font-bold text-gray-900">{travelProfile.currently_planning}</p>
            <p className="text-xs text-gray-500 mt-1">Been there? Leave a tip in the guestbook below.</p>
          </div>
        )}

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

        {/* Favourite countries visited */}
        {top8.length > 0 && (
          <Section title="Favourite countries visited">
            <ol className="grid grid-cols-1 gap-2">
              {top8.map(p => {
                const country = getCountryByIso2(p.iso2)
                return (
                  <li key={p.iso2}>
                    <Link href={`/country/${p.iso2}`} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 hover:bg-brand-50">
                      <span className="text-xs font-bold text-gray-400 w-4">{p.top8_rank}</span>
                      <CountryFlag iso2={p.iso2} country={country?.name} ariaHidden size="sm" />
                      <span className="text-sm font-medium text-gray-800 truncate">{country?.name ?? p.iso2.toUpperCase()}</span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </Section>
        )}

        {/* Been — collapsed behind a details/summary once it's a long
            list, no client component needed for a plain expand toggle. */}
        {been.length > 0 && (
          <Section title={`I've been · ${been.length} ${been.length === 1 ? 'country' : 'countries'}`}>
            <details className="group">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                Show all <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="flex flex-wrap gap-2 mt-3">
                {been.map(p => {
                  const country = getCountryByIso2(p.iso2)
                  return (
                    <Link
                      key={p.iso2}
                      href={`/country/${p.iso2}`}
                      className="inline-flex items-center gap-1.5 bg-white rounded-full pl-2 pr-3 py-1 text-sm font-medium text-gray-800 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <CountryFlag iso2={p.iso2} country={country?.name} ariaHidden size="sm" />
                      {country?.name ?? p.iso2.toUpperCase()}
                    </Link>
                  )
                })}
              </div>
            </details>
          </Section>
        )}

        {/* Want to go — capped at 10, unlike "Been" this stays a plain
            list rather than collapsing behind a toggle. */}
        {want.length > 0 && (
          <Section title="I want to go">
            <div className="flex flex-wrap gap-2">
              {want.slice(0, 10).map(p => {
                const country = getCountryByIso2(p.iso2)
                return (
                  <Link
                    key={p.iso2}
                    href={`/country/${p.iso2}`}
                    className="inline-flex items-center gap-1.5 bg-white/80 border border-dashed border-white rounded-full pl-2 pr-3 py-1 text-sm font-medium text-gray-700 hover:bg-white"
                  >
                    <CountryFlag iso2={p.iso2} country={country?.name} ariaHidden size="sm" />
                    {country?.name ?? p.iso2.toUpperCase()}
                  </Link>
                )
              })}
              {want.length > 10 && (
                <span className="inline-flex items-center text-sm text-white/70 px-2 py-1">
                  +{want.length - 10} more
                </span>
              )}
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
                const label = shortName(b.full_name) || b.username
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

        <GuestbookSection
          profileUserId={profile.id}
          initialEntries={guestbookEntries}
          initialHasMore={guestbookHasMore}
          viewerId={viewer?.id ?? null}
          isOwner={isOwner}
        />

        {been.length === 0 && want.length === 0 && favourites.length === 0 && !favCountry && buddies.length === 0 && (
          <p className="text-center text-sm text-white/70 italic mt-10">
            {isOwner ? "You haven't added anything yet." : `${shortName(profile.full_name) || profile.username} hasn't added anything yet.`}
          </p>
        )}
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
