// Shared enrichment for comment authors (blog + guide comments):
// their public avatar photo, and — for admin/team accounts only —
// a real-name signature so an official reply reads like one ("Oli
// replied to your comment" vs an anonymous handle). Regular users
// keep their free-form username, this never surfaces their full name.

import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admin'
import { shortName } from '@/lib/display-name'

export async function resolveCommentAuthorExtras(
  service: SupabaseClient,
  authorIds: string[],
  fullNameById: Map<string, string | null>,
): Promise<{ photoByUser: Map<string, string>; adminNameByUser: Map<string, string> }> {
  const photoByUser = new Map<string, string>()
  const adminNameByUser = new Map<string, string>()
  if (authorIds.length === 0) return { photoByUser, adminNameByUser }

  const [photosRes, ...userResults] = await Promise.all([
    // Only the public travel-profile photo — a private one shouldn't
    // leak into comments just because someone commented somewhere.
    service.from('travel_profiles').select('user_id, hero_photo_url').in('user_id', authorIds).eq('is_public', true),
    ...authorIds.map(id => service.auth.admin.getUserById(id)),
  ])

  for (const row of (photosRes.data ?? []) as Array<{ user_id: string; hero_photo_url: string | null }>) {
    if (row.hero_photo_url) photoByUser.set(row.user_id, row.hero_photo_url)
  }

  authorIds.forEach((id, i) => {
    const email = userResults[i]?.data?.user?.email
    if (isAdminEmail(email)) {
      const name = shortName(fullNameById.get(id) ?? null)
      if (name) adminNameByUser.set(id, name)
    }
  })

  return { photoByUser, adminNameByUser }
}
