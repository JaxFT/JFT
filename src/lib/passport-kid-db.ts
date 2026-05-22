// Server-side data access for the KID view of the passport.
//
// Kids are unauthenticated — they reach the app via /kid/{token} only,
// where the URL itself is the bearer credential. RLS policies are
// parent-scoped (auth.uid() = children.parent_id), so kid reads can't
// go through the cookie client. We use the service role instead and
// always look the kid up by qr_token first, never by id from the URL.

import { createClient as createSbClient } from '@supabase/supabase-js'
import type { ChildRow, StampStatus, StampType } from './passport-types'

function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  }
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function getChildByToken(token: string): Promise<ChildRow | null> {
  if (!token || token.length < 8) return null
  const { data, error } = await admin()
    .from('children')
    .select('*')
    .eq('qr_token', token)
    .maybeSingle()

  if (error) {
    console.error('[passport] getChildByToken', error)
    return null
  }
  return (data as ChildRow) ?? null
}

export type StampRow = {
  id: string
  child_id: string
  type: StampType
  country_slug: string | null
  note: string | null
  awarded_by: 'system' | 'parent' | 'self'
  status: StampStatus
  earned_at: string
  decided_at: string | null
  created_at: string
  // Populated only when type='CUSTOM'; null for the 17 system types.
  custom_label: string | null
  custom_emoji: string | null
  custom_shape: string | null
  custom_ink: string | null
}

export async function listAwardedStampsForChild(childId: string): Promise<StampRow[]> {
  const { data, error } = await admin()
    .from('stamps')
    .select('*')
    .eq('child_id', childId)
    .eq('status', 'awarded')
    .order('earned_at', { ascending: false })

  if (error) {
    console.error('[passport] listAwardedStampsForChild', error)
    return []
  }
  return (data ?? []) as StampRow[]
}

export type KidStats = {
  stampCount: number
  countriesUnlocked: number
  packsCompleted: number
}

export async function getKidStats(childId: string): Promise<KidStats> {
  const sb = admin()
  const [stampsRes, visitsRes, packsRes] = await Promise.all([
    sb.from('stamps').select('id', { count: 'exact', head: true }).eq('child_id', childId).eq('status', 'awarded'),
    sb.from('child_country_visits').select('id', { count: 'exact', head: true }).eq('child_id', childId),
    sb.from('kid_adventure_pack_sessions').select('id', { count: 'exact', head: true }).eq('child_id', childId).not('completed_at', 'is', null),
  ])
  return {
    stampCount: stampsRes.count ?? 0,
    countriesUnlocked: visitsRes.count ?? 0,
    packsCompleted: packsRes.count ?? 0,
  }
}

export type CountryVisitRow = {
  country_slug: string
  first_visit_date: string
}

export async function listCountryVisitsForChild(childId: string): Promise<CountryVisitRow[]> {
  const { data, error } = await admin()
    .from('child_country_visits')
    .select('country_slug, first_visit_date')
    .eq('child_id', childId)
    .order('first_visit_date', { ascending: true })

  if (error) {
    console.error('[passport] listCountryVisitsForChild', error)
    return []
  }
  return (data ?? []) as CountryVisitRow[]
}

// Adventures the parent has assigned to this child, with a hint of
// how far through each one the kid is. Drives the Adventures section
// on the kid's Passport tab.
export type AssignedPackRow = {
  country_slug: string
  missions_complete: string[]
  completed_at: string | null
}

// Country-scoped stamps for a child (only this country's stamps, only
// awarded). Used on the country passport page.
export async function listStampsForChildCountry(childId: string, countrySlug: string): Promise<StampRow[]> {
  const { data, error } = await admin()
    .from('stamps')
    .select('*')
    .eq('child_id', childId)
    .eq('status', 'awarded')
    .eq('country_slug', countrySlug)
    .order('earned_at', { ascending: false })

  if (error) {
    console.error('[passport] listStampsForChildCountry', error)
    return []
  }
  return (data ?? []) as StampRow[]
}

// Has the child completed the pack for this country? Used to render
// the "Pack complete!" badge on the country page.
export async function getKidPackProgress(childId: string, countrySlug: string): Promise<{
  missionsComplete: string[]
  completedAt: string | null
} | null> {
  const { data, error } = await admin()
    .from('kid_adventure_pack_sessions')
    .select('missions_complete, completed_at')
    .eq('child_id', childId)
    .eq('country_slug', countrySlug)
    .maybeSingle()
  if (error || !data) return null
  return {
    missionsComplete: (data.missions_complete as string[]) ?? [],
    completedAt: (data.completed_at as string) ?? null,
  }
}

export async function listAssignedPacksForChild(childId: string): Promise<AssignedPackRow[]> {
  const sb = admin()
  const [assignmentsRes, sessionsRes] = await Promise.all([
    sb
      .from('child_pack_assignments')
      .select('country_slug')
      .eq('child_id', childId)
      .order('assigned_at', { ascending: true }),
    sb
      .from('kid_adventure_pack_sessions')
      .select('country_slug, missions_complete, completed_at')
      .eq('child_id', childId),
  ])

  const progress = new Map<string, { missions_complete: string[]; completed_at: string | null }>()
  for (const s of sessionsRes.data ?? []) {
    progress.set(s.country_slug as string, {
      missions_complete: (s.missions_complete as string[]) ?? [],
      completed_at: (s.completed_at as string) ?? null,
    })
  }

  return (assignmentsRes.data ?? []).map(a => {
    const slug = a.country_slug as string
    const p = progress.get(slug)
    return {
      country_slug: slug,
      missions_complete: p?.missions_complete ?? [],
      completed_at: p?.completed_at ?? null,
    }
  })
}
