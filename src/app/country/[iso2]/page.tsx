import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Compass, Crown, MapPin, Rocket } from 'lucide-react'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCountryByIso2 } from '@/lib/countries'
import { getPackByIso2 } from '@/lib/adventurePackMeta'
import { listPublishedPostsByCountrySlug } from '@/lib/blog-db'
import { findOtherGuidesForCountrySlug } from '@/lib/related-content'
import { formatPrice } from '@/lib/guides-db'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { getSocialCounts } from '@/lib/recommendation-social'
import { getBlogLinksForRecommendations } from '@/lib/recommendation-blog-links'
import { isAdminEmail, filterAdminUserIds } from '@/lib/admin'
import { shortName } from '@/lib/display-name'
import { proxyImageUrl } from '@/lib/image-proxy'
import CountryFlag from '@/components/CountryFlag'
import RelatedPostsSection from '@/components/RelatedPostsSection'
import { BACKGROUND_THEMES, isValidBackgroundTheme } from '@/app/travel-profile/background-themes'
import type { Recommendation } from '@/components/recommendations/types'
import CountryRecommendationsList from './CountryRecommendationsList'

export async function generateMetadata(
  { params }: { params: Promise<{ iso2: string }> },
): Promise<Metadata> {
  const { iso2 } = await params
  const country = getCountryByIso2(iso2)
  return { title: country ? country.name : 'Country' }
}

export const dynamic = 'force-dynamic'

// One hub per country, linking the three things that were previously
// siloed on their own pages: who's been here (travel_profile_places),
// what's good here (recommendations), and their public profiles.
// Public read like /discover and /recommendations, adding/voting
// there still needs an account.
export default async function CountryPage(
  { params }: { params: Promise<{ iso2: string }> },
) {
  const { iso2: rawIso2 } = await params
  const country = getCountryByIso2(rawIso2)
  if (!country) notFound()
  const iso2 = country.iso2
  const pack = getPackByIso2(iso2)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: beenRows }, { data: recRows }, relatedPosts, relatedGuides] = await Promise.all([
    supabase.from('travel_profile_places').select('user_id').eq('iso2', iso2).eq('list_type', 'been'),
    supabase.from('recommendations')
      .select('id, user_id, category, place_name, iso2, town, google_maps_url, date_visited, rating, note, created_at')
      .eq('iso2', iso2)
      .order('created_at', { ascending: false }),
    pack ? listPublishedPostsByCountrySlug(pack.slug, { limit: 4 }) : Promise.resolve([]),
    pack ? findOtherGuidesForCountrySlug(pack.slug) : Promise.resolve([]),
  ])

  // Travellers — only ones with a public Travel Profile show up, same
  // visibility rule as /discover.
  const travellerIds = [...new Set((beenRows ?? []).map(r => r.user_id))]
  const { data: publicProfiles } = travellerIds.length > 0
    ? await supabase
        .from('travel_profiles')
        .select('user_id, hero_photo_url, hero_photo_focal_x, hero_photo_focal_y, background_theme')
        .in('user_id', travellerIds)
        .eq('is_public', true)
    : { data: [] }
  const names = await getPublicProfilesByIds((publicProfiles ?? []).map(p => p.user_id))
  const travellers = (publicProfiles ?? [])
    .map(tp => ({ ...tp, ...names.get(tp.user_id) }))
    .filter(p => p.username || p.full_name)

  // Recommendations for this country.
  const allRecRows = recRows ?? []
  const authorIds = [...new Set(allRecRows.map(r => r.user_id))]
  const isAdmin = isAdminEmail(user?.email)
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const [authors, socialCounts, blogLinks, adminAuthorIds] = await Promise.all([
    getPublicProfilesByIds(authorIds),
    getSocialCounts(supabase, allRecRows.map(r => r.id), user?.id ?? null),
    getBlogLinksForRecommendations(allRecRows),
    isAdmin ? filterAdminUserIds(admin, authorIds) : Promise.resolve(new Set<string>()),
  ])
  const recommendations: Recommendation[] = allRecRows.map(r => ({
    ...r,
    author: authors.get(r.user_id) ?? null,
    ...(socialCounts.get(r.id) ?? { up_votes: 0, down_votes: 0, my_vote: null, comment_count: 0 }),
    blog_link: blogLinks.get(r.id) ?? null,
  }))

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-1">
          <CountryFlag iso2={iso2} country={country.name} ariaHidden size="xl" />
          <h1 className="text-3xl font-bold text-gray-900">{country.name}</h1>
        </div>
        <p className="text-gray-500 mb-8">
          {travellers.length} {travellers.length === 1 ? 'traveller has' : 'travellers have'} been here · {recommendations.length} {recommendations.length === 1 ? 'recommendation' : 'recommendations'}
        </p>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4 text-brand-600" />
            <h2 className="text-lg font-bold text-gray-900">Travellers who&apos;ve been here</h2>
          </div>
          {travellers.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No public Travel Profiles have added {country.name} yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {travellers.map(p => {
                const rawTheme: unknown = p.background_theme
                const theme = BACKGROUND_THEMES[isValidBackgroundTheme(rawTheme) ? rawTheme : 'brand']
                const focal = `${p.hero_photo_focal_x ?? 50}% ${p.hero_photo_focal_y ?? 50}%`
                return (
                  <Link
                    key={p.user_id}
                    href={`/u/${p.username}`}
                    className="group flex items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-sm p-2 hover:border-brand-200 hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ background: theme.gradient }}>
                      {p.hero_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={proxyImageUrl(p.hero_photo_url)}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ objectPosition: focal }}
                        />
                      ) : (
                        <span className="text-white text-sm font-bold">
                          {(shortName(p.full_name) || p.username || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 truncate">
                      {shortName(p.full_name) || p.username}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-brand-600" />
            <h2 className="text-lg font-bold text-gray-900">Recommendations in {country.name}</h2>
          </div>
          {recommendations.length === 0 ? (
            <p className="text-sm text-gray-400 italic mb-3">Nothing added for {country.name} yet.</p>
          ) : (
            <CountryRecommendationsList
              initialRecommendations={recommendations}
              currentUserId={user?.id ?? null}
              isAdmin={isAdmin}
              adminAuthorIds={[...adminAuthorIds]}
            />
          )}
          <Link href="/recommendations" className="text-sm font-semibold text-brand-600 hover:underline">
            Browse or add all recommendations →
          </Link>
        </section>

        <RelatedPostsSection posts={relatedPosts} heading={`From the blog: ${country.name}`} bare />

        {(relatedGuides.length > 0 || pack) && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <h2 className="text-lg font-bold text-gray-900">Plan your trip</h2>
            </div>

            {pack && (
              <Link
                href={`/adventure-packs/${pack.slug}`}
                className="group flex items-center gap-3 bg-brand-950 text-white rounded-xl p-4 mb-3 hover:bg-brand-900 transition-colors"
              >
                <Rocket className="w-5 h-5 text-brand-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{pack.country} Adventure Pack</p>
                  <p className="text-sm text-white/60">Kids&apos; activities, language, food and games for the trip.</p>
                </div>
                {pack.isFree && (
                  <span className="text-xs font-bold uppercase tracking-wide bg-white/15 rounded-full px-2.5 py-1 shrink-0">Free</span>
                )}
              </Link>
            )}

            {relatedGuides.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relatedGuides.map(g => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className="group flex gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:border-brand-200 hover:shadow-md transition-all"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {g.cover_image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={proxyImageUrl(g.cover_image)} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      {g.is_premium && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-full w-fit mb-1">
                          <Crown className="w-2.5 h-2.5" /> Premium
                        </span>
                      )}
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-brand-700 line-clamp-2">{g.title}</p>
                      <span className="text-xs font-medium text-gray-500 mt-0.5">{formatPrice(g.price_pence)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
