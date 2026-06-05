// POST /api/blog/[slug]/comments
// Create a comment on a blog post. Requires sign-in AND a username
// set on the profile — the UI nudges users through the username
// modal before letting them submit.

import { NextResponse, after } from 'next/server'
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

  let body: { body?: string; parent_id?: string | null } = {}
  try { body = await request.json() } catch {}
  const text = (body.body ?? '').trim()
  if (text.length < MIN_LENGTH) {
    return NextResponse.json({ error: 'Say a bit more — at least 2 characters.' }, { status: 400 })
  }
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Comments are capped at ${MAX_LENGTH} characters.` }, { status: 400 })
  }

  // Resolve the parent for replies. We keep threads one level deep, so
  // a reply to a reply attaches to that reply's own parent (the
  // top-level comment). Validate the parent exists on this same post.
  let parentId: string | null = null
  const rawParent = body.parent_id ?? null
  if (rawParent) {
    const { data: parent } = await supabase
      .from('blog_comments')
      .select('id, post_slug, parent_id')
      .eq('id', rawParent)
      .maybeSingle()
    if (!parent || parent.post_slug !== slug) {
      return NextResponse.json({ error: 'That comment no longer exists.' }, { status: 400 })
    }
    parentId = parent.parent_id ?? parent.id
  }

  const { data, error } = await supabase
    .from('blog_comments')
    .insert({ post_slug: slug, user_id: user.id, body: text, parent_id: parentId })
    .select('id, body, created_at, parent_id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire admin notification via `after()` so the work outlives the
  // request response on Cloudflare Workers (a plain `void` Promise gets
  // cancelled when the Worker context tears down). Skip when the
  // commenter is an admin (no point emailing ourselves about our own
  // comments).
  if (user.email && !isAdminEmail(user.email)) {
    const username = profile.username
    const commenterEmail = user.email
    const commentId = data.id as string
    after(async () => {
      await notifyAdminsOfComment({
        slug,
        commentId,
        body: text,
        username,
        commenterEmail,
      })
    })
  }

  return NextResponse.json({
    ok: true,
    comment: {
      id: data.id,
      body: data.body,
      created_at: data.created_at,
      parent_id: data.parent_id ?? null,
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
