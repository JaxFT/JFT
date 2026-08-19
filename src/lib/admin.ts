import type { SupabaseClient } from '@supabase/supabase-js'

// Hardcoded admin allowlist. Lowercase-compared to user.email.
// To add an admin: add their email here and redeploy.
export const ADMIN_EMAILS = [
  'luckbao@icloud.com',
  'jaxfamilytravels7@gmail.com',
] as const

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase() as typeof ADMIN_EMAILS[number])
}

// Which of these user ids belong to admins — used where the UI/API
// needs to tell "an admin's own content" apart from a regular
// member's (e.g. admins editing each other's Recommendations entries,
// not just deleting/moderating them). One auth lookup per id, same
// pattern as resolveCommentAuthorExtras.
export async function filterAdminUserIds(service: SupabaseClient, userIds: string[]): Promise<Set<string>> {
  const admins = new Set<string>()
  if (userIds.length === 0) return admins
  const results = await Promise.all(userIds.map(id => service.auth.admin.getUserById(id)))
  userIds.forEach((id, i) => {
    if (isAdminEmail(results[i]?.data?.user?.email)) admins.add(id)
  })
  return admins
}

// Profile ids that should NOT count toward the premium / free totals
// on the admin live-traffic card. Use for test accounts, dummy logins,
// or anyone we don't want skewing the headline numbers.
export const EXCLUDED_FROM_USER_COUNTS = [
  '10759834-4852-48ce-a683-672180fa03a2',
  'a8088d2a-bf9c-44dc-a675-10f2176cabab',
  'ee782ef5-f61c-44eb-a831-3ca24a67465f',
  'c4fbcea5-5de8-424c-bdb0-326900b096c3',
  'f3d0b296-b21f-4c1b-97d6-b8333d1bb9d7',
] as const
