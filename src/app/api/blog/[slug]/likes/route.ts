// POST /api/blog/[slug]/likes
// Toggle the signed-in user's like on a blog post. Returns the new
// state (liked + count) for optimistic-UI confirmation.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to like posts.' }, { status: 401 })

  // Check current state.
  const { data: existing } = await supabase
    .from('blog_post_likes')
    .select('user_id')
    .eq('post_slug', slug)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('blog_post_likes')
      .delete()
      .eq('post_slug', slug)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('blog_post_likes')
      .insert({ post_slug: slug, user_id: user.id })
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Return the new count so the client can confirm its optimistic update.
  const { count } = await supabase
    .from('blog_post_likes')
    .select('user_id', { count: 'exact', head: true })
    .eq('post_slug', slug)

  return NextResponse.json({
    ok: true,
    liked: !existing,
    count: count ?? 0,
  })
}
