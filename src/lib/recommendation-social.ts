// Batch-fetch vote tallies + comment counts for a set of recommendation
// ids, aggregated in memory rather than a SQL GROUP BY — same
// fetch-then-aggregate pattern used elsewhere at this site's scale
// (see /discover's own comment on why). Called from every place that
// renders a list of RecommendationCards, so cards never have to fetch
// their own counts on mount.

import type { SupabaseClient } from '@supabase/supabase-js'

export type SocialCounts = { up_votes: number; down_votes: number; my_vote: 1 | -1 | null; comment_count: number }

export async function getSocialCounts(
  supabase: SupabaseClient,
  recommendationIds: string[],
  viewerId: string | null,
): Promise<Map<string, SocialCounts>> {
  const map = new Map<string, SocialCounts>()
  if (recommendationIds.length === 0) return map
  for (const id of recommendationIds) map.set(id, { up_votes: 0, down_votes: 0, my_vote: null, comment_count: 0 })

  const [{ data: votes }, { data: comments }] = await Promise.all([
    supabase.from('recommendation_votes').select('recommendation_id, user_id, value').in('recommendation_id', recommendationIds),
    supabase.from('recommendation_comments').select('recommendation_id').in('recommendation_id', recommendationIds),
  ])

  for (const v of (votes ?? []) as Array<{ recommendation_id: string; user_id: string; value: number }>) {
    const entry = map.get(v.recommendation_id)
    if (!entry) continue
    if (v.value === 1) entry.up_votes += 1
    else entry.down_votes += 1
    if (viewerId && v.user_id === viewerId) entry.my_vote = v.value === 1 ? 1 : -1
  }
  for (const c of (comments ?? []) as Array<{ recommendation_id: string }>) {
    const entry = map.get(c.recommendation_id)
    if (entry) entry.comment_count += 1
  }

  return map
}
