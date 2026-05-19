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
  // Some auto-stamps SHOULD be allowed to repeat — e.g. each flight
  // earns a BRAVE_TRAVELLER, not just the first one. Setting this
  // true skips the per-(child, type, country) dedupe.
  skipDedupe?: boolean
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

  // Dedupe system awards unless caller opted out.
  if (input.awardedBy === 'system' && !input.skipDedupe) {
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

// Stamps that require a minimum number of interactions before firing,
// so a kid has to actually engage with the section rather than just
// open it.
const FOOD_THRESHOLD = 3
const LANGUAGE_THRESHOLD = 3
const ANIMAL_THRESHOLD = 3

// Detect which auto-stamps a section save should fire. Reads the
// stored answers and returns the stamp types triggered. Idempotent —
// the dedupe in awardOrSuggestStamp handles repeat calls.
export function autoStampsForSection(
  section: SectionKey,
  answers: SectionAnswers,
): StampType[] {
  const out: StampType[] = []
  // Food: BRAVE_EATER fires after tasting 3+ local foods.
  if (section === 'food') {
    const tried = Object.entries(answers).filter(([k, v]) => k.startsWith('tried-') && !!v).length
    if (tried >= FOOD_THRESHOLD) out.push('BRAVE_EATER')
  }
  // Language: LOCAL_LINGO fires after attempting 3+ phrases.
  if (section === 'language') {
    const used = Object.entries(answers).filter(([k, v]) => k.startsWith('used-') && !!v).length
    if (used >= LANGUAGE_THRESHOLD) out.push('LOCAL_LINGO')
  }
  // Animals: ANIMAL_SPOTTER fires after spotting 3+ animals.
  if (section === 'animals') {
    const spotted = Object.entries(answers).filter(([k, v]) => k.startsWith('spotted-') && !!v).length
    if (spotted >= ANIMAL_THRESHOLD) out.push('ANIMAL_SPOTTER')
  }
  return out
}

// Most section completions earn a single stamp the moment the mission
// is marked complete. Food and language are different: they go
// through autoStampsForSection above with an interaction threshold
// (3+ foods tried / 3+ phrases used) so kids actually have to engage
// rather than tick "complete" without doing anything.
const SECTION_STAMPS: Record<SectionKey, StampType[]> = {
  map:       ['MAP_READER'],
  language:  [], // gated by 3+ used-* in autoStampsForSection
  money:     ['MONEY_CHANGER'],
  food:      [], // gated by 3+ tried-* in autoStampsForSection
  geography: ['GEOGRAPHY_GENIUS'],
  scavenger: ['SCAVENGER_HUNTER'],
  animals:   [], // gated by 3+ spotted-* in autoStampsForSection
  senses:    ['SENSE_SEEKER'],
  stories:   ['STORY_KEEPER'],
  convo:     ['FAMILY_CHATTERBOX'],
}

export function autoStampsForMissionComplete(section: SectionKey): StampType[] {
  return SECTION_STAMPS[section] ?? []
}
