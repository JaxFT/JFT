import type { Metadata } from 'next'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { getSocialCounts } from '@/lib/recommendation-social'
import { getBlogLinksForRecommendations } from '@/lib/recommendation-blog-links'
import { isAdminEmail, filterAdminUserIds } from '@/lib/admin'
import { shortName } from '@/lib/display-name'
import RecommendationsBrowser from './RecommendationsBrowser'
import type { Recommendation } from '@/components/recommendations/types'

export const metadata: Metadata = { title: 'Recommendations' }
export const dynamic = 'force-dynamic'

// Public read, like /discover — browsing works signed out. Adding,
// voting and commenting still need an account, gated in the client
// component (which knows currentUserId is null) and backstopped by
// RLS + the API routes either way.
export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>
}) {
  const { user: authorFilterId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rows } = await supabase
    .from('recommendations')
    .select('id, user_id, category, place_name, iso2, town, google_maps_url, link_url, link_label, date_visited, rating, note, created_at')
    .order('created_at', { ascending: false })

  const allRows = rows ?? []
  const authorIds = [...new Set(allRows.map(r => r.user_id))]
  const isViewerAdmin = isAdminEmail(user?.email)
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const [authors, socialCounts, blogLinks, adminAuthorIds] = await Promise.all([
    getPublicProfilesByIds(authorIds),
    getSocialCounts(supabase, allRows.map(r => r.id), user?.id ?? null),
    getBlogLinksForRecommendations(allRows),
    // Only worth resolving if the viewer is themselves an admin —
    // nobody else can use this to edit another admin's entry anyway.
    isViewerAdmin ? filterAdminUserIds(admin, authorIds) : Promise.resolve(new Set<string>()),
  ])
  const recommendations: Recommendation[] = allRows.map(r => ({
    ...r,
    author: authors.get(r.user_id) ?? null,
    ...(socialCounts.get(r.id) ?? { up_votes: 0, down_votes: 0, my_vote: null, comment_count: 0 }),
    blog_link: blogLinks.get(r.id) ?? null,
  }))

  // Author name for the "showing X's recommendations" banner, when
  // /recommendations?user=... is used (linked from someone's Travel
  // Profile page).
  let authorFilterName: string | null = null
  if (authorFilterId) {
    const match = authors.get(authorFilterId)
      ?? (await getPublicProfilesByIds([authorFilterId])).get(authorFilterId)
    authorFilterName = match ? (shortName(match.full_name) || match.username) : null
  }

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Recommendations</h1>
        <p className="text-gray-500 mb-6">
          These are places we, and our travel community, have actually visited, along with honest thoughts to give
          you ideas if you&apos;re researching a destination. Some link through to a longer blog post or guide where
          we&apos;ve covered it in more detail, and where it&apos;s appropriate, there&apos;s a Google Maps link too,
          so you can read further reviews and find the exact location.
        </p>
        <RecommendationsBrowser
          initialRecommendations={recommendations}
          currentUserId={user?.id ?? null}
          isAdmin={isViewerAdmin}
          adminAuthorIds={[...adminAuthorIds]}
          authorFilter={authorFilterId ? { id: authorFilterId, name: authorFilterName } : null}
        />
      </div>
    </div>
  )
}
