// Idempotently ensure a profiles row exists for the given auth user.
//
// Background: profiles has an UPDATE RLS policy but no INSERT policy,
// and the row is supposed to be created by a trigger on auth.users
// insert. If that trigger ever fails or wasn't present when the user
// signed up, the profile row stays missing and every later UPDATE
// silently matches zero rows, you save your name, see "Saved", come
// back next day, and the field is empty again.
//
// Calling ensureProfile() from a server page guarantees the row
// exists before we read or write it. Uses service role to bypass the
// missing INSERT policy.

import { createClient as createSbClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

export async function ensureProfile(user: User): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: existing } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const metaName = (user.user_metadata?.full_name as string | undefined)?.trim() || null

  if (!existing) {
    // Row missing, create it. Pull whatever we know from auth metadata.
    await admin.from('profiles').insert({
      id: user.id,
      full_name: metaName,
      subscription_tier: 'free',
    })
    return
  }

  // Row exists but full_name is blank and auth metadata has one.
  // Backfill so the user doesn't have to retype it.
  if (!existing.full_name && metaName) {
    await admin
      .from('profiles')
      .update({ full_name: metaName })
      .eq('id', user.id)
  }
}
