// Server-side data access for the Family Travel Passport. Uses the
// cookie-aware Supabase client so RLS does its job: every read here is
// scoped to "children where parent_id = auth.uid()", no manual checks.

import { createClient } from '@/lib/supabase/server'
import type { ChildRow, StampStatus, StampType } from './passport-types'

export async function listChildPackAssignments(childId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('child_pack_assignments')
    .select('country_slug')
    .eq('child_id', childId)
    .order('assigned_at', { ascending: true })

  if (error) {
    console.error('[passport] listChildPackAssignments', error)
    return []
  }
  return (data ?? []).map(r => r.country_slug as string)
}

export type ChildCountryVisitRow = {
  country_slug: string
  first_visit_date: string // YYYY-MM-DD
}

export type ParentStampRow = {
  id: string
  type: StampType
  country_slug: string | null
  note: string | null
  awarded_by: 'system' | 'parent' | 'self'
  status: StampStatus
  earned_at: string
  decided_at: string | null
  // Populated only when type='CUSTOM'.
  custom_label: string | null
  custom_emoji: string | null
  custom_shape: string | null
  custom_ink: string | null
}

export type FlightRow = {
  id: string
  from_airport: string
  to_airport: string
  flight_date: string // YYYY-MM-DD
  duration_mins: number | null
  distance_km: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// All flights for the signed-in parent, newest flight_date first.
export async function listFlightsForParent(): Promise<FlightRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flights')
    .select('id, from_airport, to_airport, flight_date, duration_mins, distance_km, notes, created_at, updated_at')
    .order('flight_date', { ascending: false })
  if (error) {
    console.error('[passport] listFlightsForParent', error)
    return []
  }
  return (data ?? []) as FlightRow[]
}

// All stamps for a child, regardless of status, newest first. Used
// for the parent's stamp management section + approval queue.
export async function listStampsForChildParent(childId: string): Promise<ParentStampRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stamps')
    .select('id, type, country_slug, note, awarded_by, status, earned_at, decided_at')
    .eq('child_id', childId)
    .order('earned_at', { ascending: false })

  if (error) {
    console.error('[passport] listStampsForChildParent', error)
    return []
  }
  return (data ?? []) as ParentStampRow[]
}

// Parent-scoped list of family country visits, ordered by date so
// the most recent are at the top of the parent's edit list. Visits
// are shared across every child in the family.
export type FamilyVisitRow = {
  iso2: string
  first_visit_date: string
}

export async function listFamilyCountryVisits(): Promise<FamilyVisitRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('family_country_visits')
    .select('iso2, first_visit_date')
    .order('first_visit_date', { ascending: false })

  if (error) {
    console.error('[passport] listFamilyCountryVisits', error)
    return []
  }
  return (data ?? []) as FamilyVisitRow[]
}

export async function listChildrenForParent(): Promise<ChildRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[passport] listChildrenForParent', error)
    return []
  }
  return (data ?? []) as ChildRow[]
}

export async function getChildById(id: string): Promise<ChildRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[passport] getChildById', error)
    return null
  }
  return (data as ChildRow) ?? null
}

// Aggregate counts for the parent dashboard cards. Cheap because the
// stamps / visits / pack-complete reads are indexed and bounded by
// the child's data set. Run all three in parallel.
export type ChildStats = {
  stampCount: number
  countriesUnlocked: number
  packsCompleted: number
}

export async function getStatsForChildren(
  childIds: string[],
): Promise<Record<string, ChildStats>> {
  if (childIds.length === 0) return {}

  const supabase = await createClient()
  // Visits live at the family level now: every child of the same
  // parent shares the same countriesUnlocked number. Pull parent_id
  // for each child, then count family_country_visits per parent.
  const [stampsRes, kidsRes, packsRes] = await Promise.all([
    supabase
      .from('stamps')
      .select('child_id')
      .in('child_id', childIds)
      .eq('status', 'awarded'),
    supabase
      .from('children')
      .select('id, parent_id')
      .in('id', childIds),
    supabase
      .from('kid_adventure_pack_sessions')
      .select('child_id')
      .in('child_id', childIds)
      .not('completed_at', 'is', null),
  ])

  const childToParent = new Map<string, string>()
  for (const c of (kidsRes.data ?? []) as Array<{ id: string; parent_id: string }>) {
    childToParent.set(c.id, c.parent_id)
  }
  const parentIds = Array.from(new Set(childToParent.values()))

  const visitsRes = parentIds.length > 0
    ? await supabase
        .from('family_country_visits')
        .select('parent_id')
        .in('parent_id', parentIds)
    : { data: [] as Array<{ parent_id: string }> }
  const visitsByParent = new Map<string, number>()
  for (const v of (visitsRes.data ?? []) as Array<{ parent_id: string }>) {
    visitsByParent.set(v.parent_id, (visitsByParent.get(v.parent_id) ?? 0) + 1)
  }

  const stats: Record<string, ChildStats> = {}
  for (const id of childIds) {
    const parentId = childToParent.get(id)
    stats[id] = {
      stampCount: 0,
      countriesUnlocked: parentId ? (visitsByParent.get(parentId) ?? 0) : 0,
      packsCompleted: 0,
    }
  }
  for (const row of (stampsRes.data ?? []) as Array<{ child_id: string }>) {
    if (stats[row.child_id]) stats[row.child_id].stampCount++
  }
  for (const row of (packsRes.data ?? []) as Array<{ child_id: string }>) {
    if (stats[row.child_id]) stats[row.child_id].packsCompleted++
  }

  return stats
}
