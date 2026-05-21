// Server-side queries for the blog social features: comments, post
// likes, comment likes, username lookups. Single source of truth so
// the blog post page and API routes share the same shapes.

import { createClient } from '@/lib/supabase/server'

export type BlogCommentRow = {
  id: string
  post_slug: string
  user_id: string
  body: string
  created_at: string
  // Joined from profiles for display.
  username: string | null
  username_is_instagram: boolean
  instagram_handle: string | null
  // Hydrated separately (efficient count + current-user state).
  like_count: number
  liked_by_me: boolean
}

export type PostSocial = {
  comments: BlogCommentRow[]
  postLikes: number
  postLikedByMe: boolean
}

// Fetch the full social state for a single blog post in one round
// trip-ish pass. Caller passes the current user id (or null for
// signed-out visitors) so we can compute "have I liked this" inline.
// `viewerIsAdmin` controls whether commenters' Instagram handles are
// included; non-admin viewers get null so handles aren't harvestable
// from the JSON payload by anyone with devtools.
export async function loadBlogPostSocial(
  postSlug: string,
  viewerId: string | null,
  viewerIsAdmin: boolean = false,
): Promise<PostSocial> {
  const supabase = await createClient()

  const [commentsRes, postLikesRes, postLikedByMeRes] = await Promise.all([
    // Comments with author profile fields joined.
    supabase
      .from('blog_comments')
      .select(`
        id, post_slug, user_id, body, created_at,
        profiles:user_id ( username, username_is_instagram, instagram_handle )
      `)
      .eq('post_slug', postSlug)
      .order('created_at', { ascending: true }),
    supabase
      .from('blog_post_likes')
      .select('user_id', { count: 'exact', head: true })
      .eq('post_slug', postSlug),
    viewerId
      ? supabase
          .from('blog_post_likes')
          .select('user_id')
          .eq('post_slug', postSlug)
          .eq('user_id', viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Supabase's generated types treat foreign-key joins as arrays even
  // for one-to-one relations. Normalise here so the rest of the file
  // can stay readable.
  type ProfileJoin = {
    username: string | null
    username_is_instagram: boolean | null
    instagram_handle: string | null
  }
  const rawComments = ((commentsRes.data ?? []) as unknown as Array<{
    id: string
    post_slug: string
    user_id: string
    body: string
    created_at: string
    profiles: ProfileJoin | ProfileJoin[] | null
  }>).map(c => ({
    ...c,
    profiles: Array.isArray(c.profiles) ? (c.profiles[0] ?? null) : c.profiles,
  }))

  // Comment-like counts + per-viewer state in one go per page.
  const commentIds = rawComments.map(c => c.id)
  let likeCounts = new Map<string, number>()
  let likedByMe = new Set<string>()
  if (commentIds.length > 0) {
    const [allLikes, myLikes] = await Promise.all([
      supabase.from('blog_comment_likes').select('comment_id').in('comment_id', commentIds),
      viewerId
        ? supabase.from('blog_comment_likes').select('comment_id').in('comment_id', commentIds).eq('user_id', viewerId)
        : Promise.resolve({ data: [] }),
    ])
    for (const row of (allLikes.data ?? []) as Array<{ comment_id: string }>) {
      likeCounts.set(row.comment_id, (likeCounts.get(row.comment_id) ?? 0) + 1)
    }
    for (const row of (myLikes.data ?? []) as Array<{ comment_id: string }>) {
      likedByMe.add(row.comment_id)
    }
  }

  const comments: BlogCommentRow[] = rawComments.map(c => ({
    id: c.id,
    post_slug: c.post_slug,
    user_id: c.user_id,
    body: c.body,
    created_at: c.created_at,
    username: c.profiles?.username ?? null,
    username_is_instagram: !!c.profiles?.username_is_instagram,
    instagram_handle: viewerIsAdmin ? (c.profiles?.instagram_handle ?? null) : null,
    like_count: likeCounts.get(c.id) ?? 0,
    liked_by_me: likedByMe.has(c.id),
  }))

  return {
    comments,
    postLikes: postLikesRes.count ?? 0,
    postLikedByMe: !!(postLikedByMeRes && 'data' in postLikedByMeRes && postLikedByMeRes.data),
  }
}

// Batch-load like + comment counts for a list of post slugs. Used by
// the blog listing pages so each card can display its own counts
// without N+1 queries.
export async function loadCountsForSlugs(
  slugs: string[],
): Promise<Record<string, { likes: number; comments: number }>> {
  if (slugs.length === 0) return {}
  const supabase = await createClient()
  const [likesRes, commentsRes] = await Promise.all([
    supabase.from('blog_post_likes').select('post_slug').in('post_slug', slugs),
    supabase.from('blog_comments').select('post_slug').in('post_slug', slugs),
  ])
  const out: Record<string, { likes: number; comments: number }> = {}
  for (const s of slugs) out[s] = { likes: 0, comments: 0 }
  for (const row of (likesRes.data ?? []) as Array<{ post_slug: string }>) {
    if (out[row.post_slug]) out[row.post_slug].likes++
  }
  for (const row of (commentsRes.data ?? []) as Array<{ post_slug: string }>) {
    if (out[row.post_slug]) out[row.post_slug].comments++
  }
  return out
}

// Look up the viewer's username so the comment form can either show
// it (ready to comment) or pop the "pick a username" modal first.
export async function getViewerProfile(): Promise<{
  userId: string | null
  username: string | null
  username_is_instagram: boolean
  instagram_handle: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, username: null, username_is_instagram: false, instagram_handle: null }
  const { data } = await supabase
    .from('profiles')
    .select('username, username_is_instagram, instagram_handle')
    .eq('id', user.id)
    .maybeSingle()
  return {
    userId: user.id,
    username: data?.username ?? null,
    username_is_instagram: !!data?.username_is_instagram,
    instagram_handle: data?.instagram_handle ?? null,
  }
}
