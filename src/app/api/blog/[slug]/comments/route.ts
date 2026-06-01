// POST /api/blog/[slug]/comments
// Create a comment on a blog post. Requires sign-in AND a username
// set on the profile — the UI nudges users through the username
// modal before letting them submit.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, HELLO_FROM, ADMIN_NOTIFY, buildNewCommentNotificationEmail } from '@/lib/email'
import { isAdminEmail } from '@/lib/admin'

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

  // Fire-and-forget admin notification. Skip when the commenter is an
  // admin (no point emailing ourselves about our own comments). Same
  // pattern as the Stripe webhook's 1:1-call-paid notification.
  if (user.email && !isAdminEmail(user.email)) {
    void notifyAdminsOfComment({
      slug,
      commentId: data.id as string,
      body: text,
      username: profile.username,
      commenterEmail: user.email,
    })
  }

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

async function notifyAdminsOfComment(p: {
  slug: string
  commentId: string
  body: string
  username: string
  commenterEmail: string
}): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: post } = await supabase
      .from('blog_posts')
      .select('title')
      .eq('slug', p.slug)
      .maybeSingle()
    const postTitle = (post as { title?: string } | null)?.title ?? p.slug
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
    const { subject, html, text } = buildNewCommentNotificationEmail({
      postTitle,
      postSlug: p.slug,
      siteUrl,
      username: p.username,
      commenterEmail: p.commenterEmail,
      commentBody: p.body,
      commentId: p.commentId,
    })
    await sendEmail({
      from: HELLO_FROM,
      to: ADMIN_NOTIFY,
      subject,
      html,
      text,
      replyTo: p.commenterEmail,
    })
  } catch (e) {
    console.error('[comments] admin notify failed', e)
  }
}
