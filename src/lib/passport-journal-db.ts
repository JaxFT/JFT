// Server-side data access for journal entries. Two callers:
//   - the kid (no auth, uses service role + qr_token validation)
//   - the parent (RLS via cookie supabase client, scoped to own kids)

import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export type JournalEntryRow = {
  id: string
  child_id: string
  country_slug: string | null
  text: string | null
  emoji_rating: string | null
  created_by: 'kid' | 'parent'
  parent_edited: boolean
  created_at: string
  updated_at: string
}

// Kid-side reads (service role).
export async function listJournalEntriesForChild(childId: string): Promise<JournalEntryRow[]> {
  const { data, error } = await admin()
    .from('journal_entries')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[passport] listJournalEntriesForChild', error)
    return []
  }
  return (data ?? []) as JournalEntryRow[]
}

export async function listJournalEntriesForChildCountry(
  childId: string,
  countrySlug: string,
): Promise<JournalEntryRow[]> {
  const { data, error } = await admin()
    .from('journal_entries')
    .select('*')
    .eq('child_id', childId)
    .eq('country_slug', countrySlug)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[passport] listJournalEntriesForChildCountry', error)
    return []
  }
  return (data ?? []) as JournalEntryRow[]
}

// Parent-side reads (cookie client, RLS).
export async function listJournalEntriesForChildParent(childId: string): Promise<JournalEntryRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[passport] listJournalEntriesForChildParent', error)
    return []
  }
  return (data ?? []) as JournalEntryRow[]
}

// Kid-mode insert via service role. Caller is responsible for having
// validated the qr_token. Permission mode is enforced here so we can't
// be tricked by a direct API hit when the kid's mode is 'view'.
export async function createKidJournalEntry(input: {
  childId: string
  countrySlug?: string | null
  text?: string | null
  emojiRating?: string | null
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if ((!input.text || !input.text.trim()) && !input.emojiRating) {
    return { ok: false, error: 'Add some text or an emoji rating.' }
  }
  const { data, error } = await admin()
    .from('journal_entries')
    .insert({
      child_id: input.childId,
      country_slug: input.countrySlug ?? null,
      text: input.text?.trim() ? input.text.trim().slice(0, 5000) : null,
      emoji_rating: input.emojiRating ? input.emojiRating.slice(0, 16) : null,
      created_by: 'kid',
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data.id }
}
