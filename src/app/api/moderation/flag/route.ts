// POST { content_type, content_id } — lets the OWNER of a piece of
// content (a guestbook page owner, a recommendation's author) flag a
// comment on it for admin attention right away, rather than waiting
// for the admin to come across it in the general review queue.
// Ownership is re-checked server-side, never trusted from the client.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { flagModerationItem, type ModerationContentType } from '@/lib/moderation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function callerOwnsContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  contentType: ModerationContentType,
  contentId: string,
): Promise<boolean> {
  if (contentType === 'guestbook_entry') {
    const { data } = await supabase
      .from('travel_profile_guestbook')
      .select('profile_user_id')
      .eq('id', contentId)
      .maybeSingle()
    return data?.profile_user_id === userId
  }
  if (contentType === 'recommendation_comment') {
    const { data: comment } = await supabase
      .from('recommendation_comments')
      .select('recommendation_id')
      .eq('id', contentId)
      .maybeSingle()
    if (!comment) return false
    const { data: rec } = await supabase
      .from('recommendations')
      .select('user_id')
      .eq('id', comment.recommendation_id)
      .maybeSingle()
    return rec?.user_id === userId
  }
  // blog_comment has no personal owner to flag as — admins already
  // see every blog comment in the review queue regardless.
  return false
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}
  const contentType = body.content_type as ModerationContentType
  const contentId = typeof body.content_id === 'string' ? body.content_id : ''
  const validTypes: ModerationContentType[] = ['guestbook_entry', 'recommendation_comment']
  if (!validTypes.includes(contentType) || !contentId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const owns = await callerOwnsContent(supabase, user.id, contentType, contentId)
  if (!owns) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const result = await flagModerationItem({ contentType, contentId, flaggedBy: user.id })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({ ok: true })
}
