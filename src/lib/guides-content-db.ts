// Server-side helpers for the new web-rendered guides (in the `guides`
// table). Kept separate from the existing src/lib/guides-db.ts which
// handles the legacy PDF guides stored in the products table.

import { createClient } from '@/lib/supabase/server'
import type { GuideRow, GuideSections } from '@/lib/guide-types'
import { emptySections } from '@/lib/guide-types'

function normaliseRow(row: unknown): GuideRow {
  const r = row as Record<string, unknown>
  const sections = (r.sections ?? {}) as GuideSections
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    subtitle: (r.subtitle as string | null) ?? null,
    country: (r.country as string | null) ?? null,
    cover_image: (r.cover_image as string | null) ?? null,
    status: (r.status as GuideRow['status']) ?? 'draft',
    is_premium: Boolean(r.is_premium),
    price_pence: Number(r.price_pence ?? 0),
    tags: (r.tags as string[]) ?? [],
    sections: { ...emptySections(), ...sections },
    preview_destinations: Number(r.preview_destinations ?? 1),
    published_at: (r.published_at as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }
}

export async function listPublishedWebGuides(): Promise<GuideRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('guides')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return (data ?? []).map(normaliseRow)
}

export async function getPublishedWebGuideBySlug(slug: string): Promise<GuideRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('guides')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return data ? normaliseRow(data) : null
}

export async function getWebGuideBySlugAny(slug: string): Promise<GuideRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('guides')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  return data ? normaliseRow(data) : null
}

export async function listAllWebGuidesForAdmin(): Promise<GuideRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('guides')
    .select('*')
    .order('updated_at', { ascending: false })
  return (data ?? []).map(normaliseRow)
}

export async function getWebGuideById(id: string): Promise<GuideRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('guides')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data ? normaliseRow(data) : null
}
