import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/ensure-profile'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { getSocialCounts } from '@/lib/recommendation-social'
import { getBlogLinksForRecommendations } from '@/lib/recommendation-blog-links'
import { isPremiumTier } from '@/lib/profile'
import TravelProfileEditor from './TravelProfileEditor'

export const metadata: Metadata = { title: 'My Travel Profile' }
export const dynamic = 'force-dynamic'

// Free for every account holder (unlike /family, which is premium-
// only) — the Travel Profile is meant to be an acquisition/engagement
// surface, not a paywalled one.
export default async function TravelProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/travel-profile')

  await ensureProfile(user)

  const [{ data: profile }, { data: travelProfile }, { data: places }, { data: buddyRows }, { count: passportVisitCount }, { data: recommendationRows }] = await Promise.all([
    supabase.from('profiles').select('username, full_name, subscription_tier').eq('id', user.id).maybeSingle(),
    supabase.from('travel_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('travel_profile_places').select('id, iso2, list_type, top8_rank').eq('user_id', user.id),
    supabase.from('travel_profile_buddies').select('id, buddy_user_id').eq('user_id', user.id).order('created_at'),
    supabase.from('family_country_visits').select('iso2', { count: 'exact', head: true }).eq('parent_id', user.id),
    supabase.from('recommendations')
      .select('id, user_id, category, place_name, iso2, town, google_maps_url, date_visited, rating, note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])
  const { data: packClaim } = await supabase
    .from('profile_completion_pack_claims')
    .select('country_slug')
    .eq('user_id', user.id)
    .maybeSingle()
  const [socialCounts, blogLinks] = await Promise.all([
    getSocialCounts(supabase, (recommendationRows ?? []).map(r => r.id), user.id),
    getBlogLinksForRecommendations(recommendationRows ?? []),
  ])
  const recommendations = (recommendationRows ?? []).map(r => ({
    ...r,
    author: null,
    ...(socialCounts.get(r.id) ?? { up_votes: 0, down_votes: 0, my_vote: null, comment_count: 0 }),
    blog_link: blogLinks.get(r.id) ?? null,
  }))

  // Buddy display names come from another user's profile row, blocked
  // by RLS under the normal client, service-role batch lookup instead.
  const buddyIds = (buddyRows ?? []).map(b => b.buddy_user_id).filter((id): id is string => !!id)
  const buddyProfiles = await getPublicProfilesByIds(buddyIds)
  const buddies = (buddyRows ?? []).flatMap(b => {
    if (!b.buddy_user_id) return []
    const p = buddyProfiles.get(b.buddy_user_id)
    return [{ id: b.id, buddy_user_id: b.buddy_user_id, username: p?.username ?? null, full_name: p?.full_name ?? null }]
  })

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to account
        </Link>

        <TravelProfileEditor
          username={profile?.username ?? null}
          fullName={profile?.full_name ?? null}
          initialProfile={travelProfile ?? null}
          initialPlaces={places ?? []}
          initialBuddies={buddies}
          hasPassportVisits={(passportVisitCount ?? 0) > 0}
          initialRecommendations={recommendations}
          alreadyClaimedPackSlug={packClaim?.country_slug ?? null}
          isPremium={isPremiumTier(profile?.subscription_tier)}
        />
      </div>
    </div>
  )
}
