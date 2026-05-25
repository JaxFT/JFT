import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// POST /api/blog/posts/[slug]/view
// Public fire-and-forget. Increments blog_posts.view_count for the
// given slug via the increment_blog_post_view RPC, unless the viewer
// is an admin (admin views don't inflate the counter we look at to
// decide what's popular).
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Bad slug' }, { status: 400 })
  }

  const supabase = await createClient()
  // Admin viewers skip the increment so their own poking around the
  // site doesn't show up as engagement on the admin list.
  const { data: { user } } = await supabase.auth.getUser()
  if (user && isAdminEmail(user.email)) {
    return NextResponse.json({ ok: true, skipped: 'admin' })
  }

  const { error } = await supabase.rpc('increment_blog_post_view', { p_slug: slug })
  if (error) {
    console.error('[blog view]', error.message)
    // Don't surface the error to the client — view tracking is best
    // effort, the post still renders.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
  return NextResponse.json({ ok: true })
}
