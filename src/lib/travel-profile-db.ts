// Service-role reads of OTHER users' public profile fields for the
// Travel Profile feature (username lookup for /u/[username], travel
// buddy display names). profiles is locked down by RLS
// (profiles_select_own — a normal viewer can only read their own
// row), same reasoning and same pattern as blog-social-db.ts's
// getServiceClient(): read server-side with the service role and only
// ever forward the public fields (id, username, full_name) to the
// client.

import { createClient as createServiceClient } from '@supabase/supabase-js'

export type PublicProfile = { id: string; username: string | null; full_name: string | null }

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// Single lookup by username, for the public /u/[username] page.
export async function getPublicProfileByUsername(username: string): Promise<PublicProfile | null> {
  const service = serviceClient()
  if (!service) return null
  const { data } = await service
    .from('profiles')
    .select('id, username, full_name')
    .eq('username', username)
    .maybeSingle()
  return data ?? null
}

// Batch lookup by id, for rendering a list of travel buddies without
// an N+1 (or a blocked embedded join, which would hit the same RLS
// wall since PostgREST evaluates the embedded table's own policies).
export async function getPublicProfilesByIds(ids: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>()
  if (ids.length === 0) return map
  const service = serviceClient()
  if (!service) return map
  const { data } = await service.from('profiles').select('id, username, full_name').in('id', ids)
  for (const p of (data ?? []) as PublicProfile[]) map.set(p.id, p)
  return map
}
