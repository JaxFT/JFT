// Service-role helpers for kid-mode pack reads/writes. Kids are
// unauthenticated, so the qr_token in the URL is the credential.
// Every helper here looks the child up by token first and refuses
// to touch anything if the token doesn't resolve.

import { createClient as createSbClient } from '@supabase/supabase-js'
import type { AgeMode, SectionAnswers, SectionKey } from './adventurePackTypes'
import type { ChildRow } from './passport-types'
import { awardOrSuggestStamp, autoAssignPackForVisit } from './passport-stamps-db'
import { getPackMeta } from './adventurePackMeta'

function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Returns the child + a flag indicating whether the parent has
// assigned this country to them. Both are needed for nearly every
// API route — child for the FK, isAssigned to refuse unauthorised
// pack opens.
export async function resolveKidPack(token: string, countrySlug: string): Promise<
  | { ok: true; child: ChildRow; isAssigned: boolean }
  | { ok: false; status: 404 | 403; error: string }
> {
  const sb = admin()
  const { data: child, error: childErr } = await sb
    .from('children')
    .select('*')
    .eq('qr_token', token)
    .maybeSingle()
  if (childErr) return { ok: false, status: 404, error: childErr.message }
  if (!child) return { ok: false, status: 404, error: 'Passport not found' }

  const { data: assignment } = await sb
    .from('child_pack_assignments')
    .select('country_slug')
    .eq('child_id', child.id)
    .eq('country_slug', countrySlug)
    .maybeSingle()

  return { ok: true, child: child as ChildRow, isAssigned: !!assignment }
}

export type LoadedKidPack = {
  ageMode: AgeMode
  hasSession: boolean
  missionsComplete: string[]
  completedAt: string | null
  answersBySection: Record<string, SectionAnswers>
}

export async function loadKidPack(childId: string, countrySlug: string): Promise<LoadedKidPack> {
  const sb = admin()
  const [answersRes, sessionRes] = await Promise.all([
    sb
      .from('kid_adventure_pack_answers')
      .select('section, answers')
      .eq('child_id', childId)
      .eq('country_slug', countrySlug),
    sb
      .from('kid_adventure_pack_sessions')
      .select('age_mode, missions_complete, completed_at')
      .eq('child_id', childId)
      .eq('country_slug', countrySlug)
      .maybeSingle(),
  ])

  const answersBySection: Record<string, SectionAnswers> = {}
  for (const row of answersRes.data ?? []) {
    const r = row as { section: string; answers: SectionAnswers }
    answersBySection[r.section] = r.answers ?? {}
  }

  const s = sessionRes.data
  return {
    ageMode: ((s?.age_mode as AgeMode) ?? 'younger'),
    hasSession: !!s,
    missionsComplete: (s?.missions_complete as string[]) ?? [],
    completedAt: (s?.completed_at as string) ?? null,
    answersBySection,
  }
}

export async function saveKidSection(
  childId: string,
  countrySlug: string,
  section: SectionKey,
  answers: SectionAnswers,
): Promise<void> {
  await admin()
    .from('kid_adventure_pack_answers')
    .upsert(
      {
        child_id: childId,
        country_slug: countrySlug,
        section,
        answers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,country_slug,section' },
    )
}

// Upserts the session row. If this is the first time the child has
// touched this country, also inserts a child_country_visits row so
// the country lights up on the Map / Countries tabs immediately.
// If all 9 missions are now complete and we haven't recorded a
// completed_at yet, stamp it (returned as `firstCompletion: true`
// so the caller can fire the ADVENTURE_PACK_COMPLETE stamp later).
export async function saveKidSession(
  childId: string,
  countrySlug: string,
  ageMode: AgeMode,
  missionsComplete: string[],
  totalSections: number,
): Promise<{ firstCompletion: boolean; firstVisit: boolean }> {
  const sb = admin()

  // Check whether this child has ever opened this pack before — used
  // to decide whether to create a country_visit row.
  const { data: existing } = await sb
    .from('kid_adventure_pack_sessions')
    .select('completed_at')
    .eq('child_id', childId)
    .eq('country_slug', countrySlug)
    .maybeSingle()

  const isFirstSession = !existing
  const wasAlreadyComplete = !!existing?.completed_at
  const isNowComplete = missionsComplete.length >= totalSections
  const firstCompletion = !wasAlreadyComplete && isNowComplete

  await sb
    .from('kid_adventure_pack_sessions')
    .upsert(
      {
        child_id: childId,
        country_slug: countrySlug,
        age_mode: ageMode,
        missions_complete: missionsComplete,
        completed_at: isNowComplete ? (existing?.completed_at ?? new Date().toISOString()) : null,
      },
      { onConflict: 'child_id,country_slug' },
    )

  let firstVisit = false
  if (isFirstSession) {
    // Visits live at the family level now (one shared list per
    // parent). Look up parent_id + pack iso2 and write there.
    const { data: childRow } = await sb
      .from('children')
      .select('parent_id')
      .eq('id', childId)
      .maybeSingle()
    const parentId = (childRow as { parent_id?: string } | null)?.parent_id ?? null
    const pack = getPackMeta(countrySlug)
    if (parentId && pack) {
      const { error: visitErr } = await sb
        .from('family_country_visits')
        .insert({ parent_id: parentId, iso2: pack.iso2 })
      // Ignore unique-violation if a parallel request also inserted.
      if (!visitErr || visitErr.code === '23505') {
        firstVisit = !visitErr
      }
      // New visit → assign the pack to every sibling who doesn't
      // already have it (the current child opened it, but siblings
      // get it auto-allocated so they can join in).
      if (firstVisit) {
        await autoAssignPackForVisit(parentId, pack.iso2)
      }
    }
    // First visit to this country earns a BRAVE_TRAVELLER stamp.
    // Dedupe inside awardOrSuggestStamp ensures only one lands per
    // country regardless of which path created the visit row.
    if (firstVisit) {
      await awardOrSuggestStamp({
        childId,
        type: 'BRAVE_TRAVELLER',
        countrySlug,
        awardedBy: 'system',
      })
    }
  }

  return { firstCompletion, firstVisit }
}

// Stamps that come from interacting with an Adventure Pack section
// or completing the whole pack. Manual parent awards and flight-
// derived BRAVE_TRAVELLER stamps live alongside these but stay put
// on a pack restart.
const PACK_DERIVED_STAMP_TYPES = [
  'BRAVE_EATER',
  'LOCAL_LINGO',
  'MAP_READER',
  'MONEY_CHANGER',
  'GEOGRAPHY_GENIUS',
  'SCAVENGER_HUNTER',
  'SENSE_SEEKER',
  'STORY_KEEPER',
  'FAMILY_CHATTERBOX',
  'ADVENTURE_PACK_COMPLETE',
]

export async function clearKidPack(childId: string, countrySlug: string): Promise<void> {
  const sb = admin()
  await sb
    .from('kid_adventure_pack_answers')
    .delete()
    .eq('child_id', childId)
    .eq('country_slug', countrySlug)
  await sb
    .from('kid_adventure_pack_sessions')
    .delete()
    .eq('child_id', childId)
    .eq('country_slug', countrySlug)
  // Wipe stamps earned from this pack so a restart feels like a true
  // restart. Flight-derived BRAVE_TRAVELLER stamps and any manually
  // parent-awarded stamps for the same country are left alone.
  await sb
    .from('stamps')
    .delete()
    .eq('child_id', childId)
    .eq('country_slug', countrySlug)
    .eq('awarded_by', 'system')
    .in('type', PACK_DERIVED_STAMP_TYPES)
  // Note: we intentionally do NOT delete the country_visit row — kids
  // shouldn't be able to wipe their own travel history.
}
