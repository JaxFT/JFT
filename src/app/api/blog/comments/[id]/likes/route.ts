// POST /api/blog/comments/[id]/likes
// Toggle the signed-in user's like on a single comment.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to like comments.' }, { status: 401 })

  const { data: existing } = await supabase
    .from('blog_comment_likes')
    .select('user_id')
    .eq('comment_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('blog_comment_likes')
      .delete()
      .eq('comment_id', id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('blog_comment_likes')
      .insert({ comment_id: id, user_id: user.id })
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const { count } = await supabase
    .from('blog_comment_likes')
    .select('user_id', { count: 'exact', head: true })
    .eq('comment_id', id)

  return NextResponse.json({
    ok: true,
    liked: !existing,
    count: count ?? 0,
  })
}
