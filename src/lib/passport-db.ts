// Server-side data access for the Family Travel Passport. Uses the
// cookie-aware Supabase client so RLS does its job: every read here is
// scoped to "children where parent_id = auth.uid()", no manual checks.

import { createClient } from '@/lib/supabase/server'
import type { ChildRow } from './passport-types'

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
