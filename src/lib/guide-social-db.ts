// Server-side queries for guide comments. Direct mirror of the
// comment-loading half of blog-social-db.ts (guides have no post-like
// button, just comments) — same shapes so GuideComments.tsx can reuse
// the BlogSocial.tsx patterns almost verbatim.

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveCommentAuthorExtras } from '@/lib/comment-author-extras'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type GuideCommentRow = {
  id: string
  guide_slug: string
  user_id: string
  body: string
  created_at: string
  parent_id: string | null
  username: string | null
  username_is_instagram: boolean
  instagram_handle: string | null
  // Public travel-profile hero photo, when the author has set one and
  // made their profile public. Null falls back to initials.
  photo_url: string | null
  // "First L." signature shown next to admin/team accounts' own
  // comments, e.g. "Oli L." — null for everyone else, regular users'
  // full names are never sent to the client.
  admin_display_name: string | null
  like_count: number
  liked_by_me: boolean
}

export async function loadGuideComments(
  guideSlug: string,
  viewerId: string | null,
  viewerIsAdmin: boolean = false,
): Promise<GuideCommentRow[]> {
  const supabase = await createClient()

  const { data: rawData } = await supabase
    .from('guide_comments')
    .select('id, guide_slug, user_id, body, created_at, parent_id')
    .eq('guide_slug', guideSlug)
    .order('created_at', { ascending: true })

  const rawComments = (rawData ?? []) as Array<{
    id: string
    guide_slug: string
    user_id: string
    body: string
    created_at: string
    parent_id: string | null
  }>

  type ProfileFields = {
    username: string | null
    username_is_instagram: boolean | null
    instagram_handle: string | null
    full_name: string | null
  }
  const profileById = new Map<string, ProfileFields>()
  const authorIds = [...new Set(rawComments.map(c => c.user_id))]
  let photoByUser = new Map<string, string>()
  let adminNameByUser = new Map<string, string>()
  if (authorIds.length > 0) {
    const service = getServiceClient()
    if (service) {
      const { data: profs } = await service
        .from('profiles')
        .select('id, username, username_is_instagram, instagram_handle, full_name')
        .in('id', authorIds)
      for (const p of (profs ?? []) as Array<{ id: string } & ProfileFields>) {
        profileById.set(p.id, p)
      }
      const fullNameById = new Map(authorIds.map(id => [id, profileById.get(id)?.full_name ?? null]))
      const extras = await resolveCommentAuthorExtras(service, authorIds, fullNameById)
      photoByUser = extras.photoByUser
      adminNameByUser = extras.adminNameByUser
    }
  }

  const commentIds = rawComments.map(c => c.id)
  const likeCounts = new Map<string, number>()
  const likedByMe = new Set<string>()
  if (commentIds.length > 0) {
    const [allLikes, myLikes] = await Promise.all([
      supabase.from('guide_comment_likes').select('comment_id').in('comment_id', commentIds),
      viewerId
        ? supabase.from('guide_comment_likes').select('comment_id').in('comment_id', commentIds).eq('user_id', viewerId)
        : Promise.resolve({ data: [] }),
    ])
    for (const row of (allLikes.data ?? []) as Array<{ comment_id: string }>) {
      likeCounts.set(row.comment_id, (likeCounts.get(row.comment_id) ?? 0) + 1)
    }
    for (const row of (myLikes.data ?? []) as Array<{ comment_id: string }>) {
      likedByMe.add(row.comment_id)
    }
  }

  return rawComments.map(c => {
    const prof = profileById.get(c.user_id)
    return {
      id: c.id,
      guide_slug: c.guide_slug,
      user_id: c.user_id,
      body: c.body,
      created_at: c.created_at,
      parent_id: c.parent_id ?? null,
      username: prof?.username ?? null,
      username_is_instagram: !!prof?.username_is_instagram,
      instagram_handle: viewerIsAdmin ? (prof?.instagram_handle ?? null) : null,
      photo_url: photoByUser.get(c.user_id) ?? null,
      admin_display_name: adminNameByUser.get(c.user_id) ?? null,
      like_count: likeCounts.get(c.id) ?? 0,
      liked_by_me: likedByMe.has(c.id),
    }
  })
}
