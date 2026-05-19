// Central stamp engine. One place to:
//   - award or suggest a stamp (dedupes, respects auto_approve)
//   - detect auto-stamp moments from pack section answers
//   - approve/reject suggestions
//   - manually award from the parent dashboard
//
// Service-role helpers are used from the kid pack flow (no auth).
// Parent-side mutations use the cookie supabase client where RLS
// scopes everything to the parent's own children.

import { createClient as createSbClient } from '@supabase/supabase-js'
import type { StampStatus, StampType } from './passport-types'
import type { SectionAnswers, SectionKey } from './adventurePackTypes'

function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export type AwardInput = {
  childId: string
  type: StampType
  countrySlug?: string | null
  note?: string | null
  awardedBy: 'system' | 'parent' | 'self'
  // For manual awards by the parent: allow overriding the earned_at
  // timestamp so a stamp can be backdated to when the event actually
  // happened. Auto-system awards omit this and default to now().
  earnedAt?: string
}

export type AwardResult =
  | { ok: true; created: boolean; id?: string; status: StampStatus }
  | { ok: false; error: string }

// Award (or suggest) a stamp for a child.
// Auto-system awards dedupe on (child_id, type, country_slug) — we
// don't want a kid to earn 50 BRAVE_EATER stamps for the same country
// just because they kept toggling food checkboxes. Parent/self awards
// don't dedupe; the parent can repeat a manual award if they want.
export async function awardOrSuggestStamp(input: AwardInput): Promise<AwardResult> {
  const sb = admin()

  // Look up the child to find stamp_auto_approve. For system awards
  // this decides whether the stamp lands as 'awarded' or 'suggested'.
  const { data: child, error: childErr } = await sb
    .from('children')
    .select('id, stamp_auto_approve')
    .eq('id', input.childId)
    .maybeSingle()
  if (childErr) return { ok: false, error: childErr.message }
  if (!child) return { ok: false, error: 'Child not found' }

  // Dedupe system awards only.
  if (input.awardedBy === 'system') {
    let q = sb
      .from('stamps')
      .select('id, status')
      .eq('child_id', input.childId)
      .eq('type', input.type)
      .in('status', ['awarded', 'suggested'])
      .limit(1)
    // Country-scoped stamps dedupe within a country; non-country
    // stamps dedupe globally for that type.
    if (input.countrySlug) {
      q = q.eq('country_slug', input.countrySlug)
    } else {
      q = q.is('country_slug', null)
    }
    const { data: existing } = await q
    if (existing && existing.length > 0) {
      return { ok: true, created: false, status: existing[0].status as StampStatus }
    }
  }

  // System awards honour auto_approve. Manual parent awards always
  // land as 'awarded'. Kid 'self' suggestions always land as 'suggested'.
  const status: StampStatus =
    input.awardedBy === 'parent' ? 'awarded'
    : input.awardedBy === 'self' ? 'suggested'
    : (child.stamp_auto_approve ? 'awarded' : 'suggested')

  const { data, error } = await sb
    .from('stamps')
    .insert({
      child_id: input.childId,
      type: input.type,
      country_slug: input.countrySlug ?? null,
      note: input.note ?? null,
      awarded_by: input.awardedBy,
      status,
      earned_at: input.earnedAt ?? new Date().toISOString(),
      decided_at: status === 'awarded' && input.awardedBy === 'parent' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, created: true, id: data.id, status }
}

// Detect which auto-stamps a section save should fire. Reads the
// stored answers and returns the stamp types triggered. Idempotent —
// the dedupe in awardOrSuggestStamp handles repeat calls.
export function autoStampsForSection(
  section: SectionKey,
  answers: SectionAnswers,
): StampType[] {
  const out: StampType[] = []
  // FoodSection keys: tried-{name}: boolean. ANY truthy means at
  // least one local food has been tried.
  if (section === 'food') {
    const triedSomething = Object.entries(answers).some(([k, v]) => k.startsWith('tried-') && !!v)
    if (triedSomething) out.push('BRAVE_EATER')
  }
  // LanguageSection keys: used-{english}: truthy when the phrase has
  // been marked used. ANY truthy means a local phrase was attempted.
  if (section === 'language') {
    const usedSomething = Object.entries(answers).some(([k, v]) => k.startsWith('used-') && !!v)
    if (usedSomething) out.push('LOCAL_LINGO')
  }
  return out
}

// Detect which auto-stamps the act of MARKING a mission complete
// should fire. The intent of "Mark food complete" is "I tried local
// food", same as ticking a food checkbox — so we fire here too,
// covering the case where a kid presses the button without ticking
// individual items. Dedupe stops this from double-awarding when both
// fire (section-save AND mission-complete).
export function autoStampsForMissionComplete(section: SectionKey): StampType[] {
  if (section === 'food') return ['BRAVE_EATER']
  if (section === 'language') return ['LOCAL_LINGO']
  return []
}
