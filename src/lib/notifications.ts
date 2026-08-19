// Shared write-side helper for in-app notifications. Always writes
// via the service role — the actor's request is creating a row on the
// RECIPIENT's account, which the recipient's own RLS policies
// correctly don't allow a normal client to do. Best-effort: a failed
// notification insert never blocks the action that triggered it.

import { createClient as createSbClient } from '@supabase/supabase-js'

export type NotificationType = 'buddy_added' | 'guestbook_comment' | 'recommendation_comment' | 'blog_comment_reply' | 'guide_comment_reply'

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function createNotification(params: {
  userId: string
  actorUserId: string | null
  type: NotificationType
  message: string
  link: string
}): Promise<void> {
  if (!params.userId || params.actorUserId === params.userId) return
  try {
    const { error } = await adminClient().from('notifications').insert({
      user_id: params.userId,
      actor_user_id: params.actorUserId,
      type: params.type,
      message: params.message,
      link: params.link,
    })
    if (error) console.error('[notifications] insert failed', error.message)
  } catch (e) {
    console.error('[notifications] create failed', e)
  }
}
