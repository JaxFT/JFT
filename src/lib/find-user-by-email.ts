import type { SupabaseClient } from '@supabase/supabase-js'

// Find a Supabase user by email — listUsers is the only admin path
// that gives us this lookup, and we filter client-side because the
// admin API doesn't accept an email filter directly. Paginates page
// by page (perPage 1000) until we find the email or exhaust the list,
// so the lookup keeps working as the user base grows past the first
// page. If this ever becomes hot enough to matter, the right fix is
// a SECURITY DEFINER SQL function that hits auth.users directly.
export async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const lower = email.toLowerCase()
  const PER_PAGE = 1000
  // Cap iterations at a million users to avoid an infinite loop if
  // the API ever stops returning an empty page at the end.
  const MAX_PAGES = 1000
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const users = data.users ?? []
    const match = users.find(u => u.email?.toLowerCase() === lower)
    if (match) return match.id
    if (users.length < PER_PAGE) return null
  }
  return null
}
