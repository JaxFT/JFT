// Save / load / clear helpers for Adventure Pack state.
// Uses the browser supabase client from src/lib/supabase/client (built
// on @supabase/ssr — the spec's reference to @supabase/auth-helpers is
// from a deprecated SDK).

import { createClient } from '@/lib/supabase/client'
import type { AgeMode, SectionAnswers, SectionKey } from './adventurePackTypes'

function client() {
  return createClient()
}

// ── ANSWERS ──────────────────────────────────────────────────────
export async function saveSection(
  userId: string,
  countrySlug: string,
  section: SectionKey,
  answers: SectionAnswers,
): Promise<void> {
  const sb = client()
  await sb
    .from('jax_adventure_pack_answers')
    .upsert(
      {
        user_id: userId,
        country_slug: countrySlug,
        section,
        answers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,country_slug,section' },
    )
}

// ── LOAD ────────────────────────────────────────────────────────
export type LoadedPack = {
  ageMode: AgeMode
  missionsComplete: string[]
  expiresAt: string | null
  answersBySection: Record<string, SectionAnswers>
}

export async function loadPack(userId: string, countrySlug: string): Promise<LoadedPack> {
  const sb = client()
  const [answersRes, sessionRes] = await Promise.all([
    sb
      .from('jax_adventure_pack_answers')
      .select('section, answers')
      .eq('user_id', userId)
      .eq('country_slug', countrySlug),
    sb
      .from('jax_adventure_pack_sessions')
      .select('age_mode, missions_complete, expires_at')
      .eq('user_id', userId)
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
    missionsComplete: (s?.missions_complete as string[]) ?? [],
    expiresAt: (s?.expires_at as string) ?? null,
    answersBySection,
  }
}

// ── SESSION ─────────────────────────────────────────────────────
export async function saveSession(
  userId: string,
  countrySlug: string,
  ageMode: AgeMode,
  missionsComplete: string[],
): Promise<string | null> {
  const sb = client()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await sb
    .from('jax_adventure_pack_sessions')
    .upsert(
      {
        user_id: userId,
        country_slug: countrySlug,
        age_mode: ageMode,
        missions_complete: missionsComplete,
        last_saved_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: 'user_id,country_slug' },
    )
    .select('expires_at')
    .single()
  return (data?.expires_at as string) ?? expiresAt
}

// ── CLEAR ───────────────────────────────────────────────────────
export async function clearPack(userId: string, countrySlug: string): Promise<void> {
  const sb = client()
  await sb
    .from('jax_adventure_pack_answers')
    .delete()
    .eq('user_id', userId)
    .eq('country_slug', countrySlug)
  await sb
    .from('jax_adventure_pack_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('country_slug', countrySlug)
}

// ── PURCHASE CHECK ──────────────────────────────────────────────
// Returns true if the user has bought this pack one-off. Schema is in
// place for when Stripe is wired; until then this always returns false
// for any non-premium user, which is fine — premium users never need
// to check and France is gated client-side.
export async function checkPackPurchase(userId: string, countrySlug: string): Promise<boolean> {
  const sb = client()
  const { data } = await sb
    .from('jax_pack_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('country_slug', countrySlug)
    .maybeSingle()
  return !!data
}
