// POST /api/guides/[slug]/comments
// Create a comment on a guide. Direct mirror of
// /api/blog/[slug]/comments — requires sign-in AND a username set on
// the profile, same reply-flattening, moderation logging, and admin
// notify email.

import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, HELLO_FROM, ADMIN_NOTIFY, buildNewCommentNotificationEmail } from '@/lib/email'
import { isAdminEmail } from '@/lib/admin'
import { createNotification } from '@/lib/notifications'
import { shortName } from '@/lib/display-name'
import { containsBlockedWord } from '@/lib/profanity-filter'
import { logModerationItem } from '@/lib/moderation'
import { getGuideBySlug } from '@/lib/guides-db'
import { getPublishedWebGuideBySlug } from '@/lib/guides-content-db'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name')
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
  if (containsBlockedWord(text)) {
    return NextResponse.json({ error: "That comment can't be posted as written." }, { status: 400 })
  }

  let parentId: string | null = null
  let notifyUserId: string | null = null
  const rawParent = body.parent_id ?? null
  if (rawParent) {
    const { data: parent } = await supabase
      .from('guide_comments')
      .select('id, guide_slug, parent_id, user_id')
      .eq('id', rawParent)
      .maybeSingle()
    if (!parent || parent.guide_slug !== slug) {
      return NextResponse.json({ error: 'That comment no longer exists.' }, { status: 400 })
    }
    if (parent.parent_id) {
      parentId = parent.parent_id
      const { data: topLevel } = await supabase.from('guide_comments').select('user_id').eq('id', parent.parent_id).maybeSingle()
      notifyUserId = topLevel?.user_id ?? null
    } else {
      parentId = parent.id
      notifyUserId = parent.user_id
    }
  }

  const { data, error } = await supabase
    .from('guide_comments')
    .insert({ guide_slug: slug, user_id: user.id, body: text, parent_id: parentId })
    .select('id, body, created_at, parent_id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (notifyUserId) {
    const name = shortName(profile.full_name) || profile.username
    await createNotification({
      userId: notifyUserId,
      actorUserId: user.id,
      type: 'guide_comment_reply',
      message: `${name} replied to your comment`,
      link: `/guides/${slug}`,
    })
  }
  await logModerationItem({
    contentType: 'guide_comment',
    contentId: data.id,
    authorUserId: user.id,
    bodySnapshot: text,
    contextLabel: `Comment on guide "${slug}"`,
    contextLink: `/guides/${slug}`,
  })

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
    // Web guides win if a row exists, same precedence as the page itself.
    const webGuide = await getPublishedWebGuideBySlug(p.slug)
    const guideTitle = webGuide?.title ?? (await getGuideBySlug(p.slug))?.name ?? p.slug
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
    const { subject, html, text } = buildNewCommentNotificationEmail({
      postTitle: guideTitle,
      postSlug: p.slug,
      basePath: 'guides',
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
    console.error('[guide comments] admin notify failed', e)
  }
}
