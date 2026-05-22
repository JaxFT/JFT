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

// Parent-scoped list of a child's country visits, ordered by date so
// the most recent are at the top of the parent's edit list.
export async function listCountryVisitsForChildParent(childId: string): Promise<ChildCountryVisitRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('child_country_visits')
    .select('country_slug, first_visit_date')
    .eq('child_id', childId)
    .order('first_visit_date', { ascending: false })

  if (error) {
    console.error('[passport] listCountryVisitsForChildParent', error)
    return []
  }
  return (data ?? []) as ChildCountryVisitRow[]
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
  const [stampsRes, visitsRes, packsRes] = await Promise.all([
    supabase
      .from('stamps')
      .select('child_id')
      .in('child_id', childIds)
      .eq('status', 'awarded'),
    supabase
      .from('child_country_visits')
      .select('child_id')
      .in('child_id', childIds),
    supabase
      .from('kid_adventure_pack_sessions')
      .select('child_id')
      .in('child_id', childIds)
      .not('completed_at', 'is', null),
  ])

  const stats: Record<string, ChildStats> = {}
  for (const id of childIds) {
    stats[id] = { stampCount: 0, countriesUnlocked: 0, packsCompleted: 0 }
  }
  for (const row of stampsRes.data ?? []) stats[row.child_id].stampCount++
  for (const row of visitsRes.data ?? []) stats[row.child_id].countriesUnlocked++
  for (const row of packsRes.data ?? []) stats[row.child_id].packsCompleted++

  return stats
}
