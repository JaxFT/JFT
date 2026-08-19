// Shared helpers for the moderation queue — logging every new comment
// (the admin "everything, reviewed once" feed) and flagging a specific
// one (the page owner's "look at this now" escalation). Always via
// the service role: these write to a table with no client-facing RLS
// policies at all.

import { createClient as createSbClient } from '@supabase/supabase-js'

export type ModerationContentType = 'blog_comment' | 'recommendation_comment' | 'guestbook_entry' | 'guide_comment'

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Best-effort — a logging failure should never block the comment/
// message that triggered it from posting.
export async function logModerationItem(params: {
  contentType: ModerationContentType
  contentId: string
  authorUserId: string | null
  bodySnapshot: string
  contextLabel: string
  contextLink: string
}): Promise<void> {
  try {
    const { error } = await adminClient()
      .from('moderation_items')
      .upsert(
        {
          content_type: params.contentType,
          content_id: params.contentId,
          author_user_id: params.authorUserId,
          body_snapshot: params.bodySnapshot,
          context_label: params.contextLabel,
          context_link: params.contextLink,
        },
        { onConflict: 'content_type,content_id' },
      )
    if (error) console.error('[moderation] log failed', error.message)
  } catch (e) {
    console.error('[moderation] log failed', e)
  }
}

export async function flagModerationItem(params: {
  contentType: ModerationContentType
  contentId: string
  flaggedBy: string
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await adminClient()
    .from('moderation_items')
    .update({ flagged: true, flagged_by: params.flaggedBy, flagged_at: new Date().toISOString() })
    .eq('content_type', params.contentType)
    .eq('content_id', params.contentId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
