// POST /api/blog/[slug]/comments
// Create a comment on a blog post. Requires sign-in AND a username
// set on the profile — the UI nudges users through the username
// modal before letting them submit.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_LENGTH = 2000
const MIN_LENGTH = 2

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  // Reject if no username — UI should have nudged them through the
  // username modal, but defend at the API boundary too.
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.username) {
    return NextResponse.json({ error: 'Pick a username first.', code: 'no_username' }, { status: 422 })
  }

  let body: { body?: string } = {}
  try { body = await request.json() } catch {}
  const text = (body.body ?? '').trim()
  if (text.length < MIN_LENGTH) {
    return NextResponse.json({ error: 'Say a bit more — at least 2 characters.' }, { status: 400 })
  }
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Comments are capped at ${MAX_LENGTH} characters.` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('blog_comments')
    .insert({ post_slug: slug, user_id: user.id, body: text })
    .select('id, body, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    comment: {
      id: data.id,
      body: data.body,
      created_at: data.created_at,
      user_id: user.id,
      username: profile.username,
    },
  })
}
