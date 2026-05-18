// Server-side helpers for the new web-rendered guides (in the `guides`
// table). Kept separate from the existing src/lib/guides-db.ts which
// handles the legacy PDF guides stored in the products table.

import { createClient } from '@/lib/supabase/server'
import type {
  GuideRow, GuideSections, GuideContentBlock,
  GuideDestination, GuideThemedSection,
} from '@/lib/guide-types'

// Migrate the legacy fixed-section shape into the new `blocks` array.
// Runs on every read, old rows in Supabase still have the old shape and
// we want them to render through the new code path unchanged.
function migrateLegacyToBlocks(
  raw: GuideSections,
  country: string | null,
  previewDestinations: number,
): GuideContentBlock[] {
  const blocks: GuideContentBlock[] = []
  let order = 0
  const where = country?.trim() || 'this country'

  if (raw.why?.body?.trim()) {
    blocks.push({
      id: 'legacy-why', kind: 'intro', heading: `Why ${where}`,
      body: raw.why.body, freePreview: true, order: order++,
    })
  }
  if (raw.highlights?.body?.trim()) {
    blocks.push({
      id: 'legacy-highlights', kind: 'intro', heading: 'Destination highlights',
      body: raw.highlights.body, freePreview: true, order: order++,
    })
  }
  if (raw.needToKnows?.body?.trim()) {
    blocks.push({
      id: 'legacy-needs', kind: 'intro', heading: 'Need to knows',
      body: raw.needToKnows.body, freePreview: true, order: order++,
    })
  }
  const dests = (raw.destinations ?? []).slice().sort((a: GuideDestination, b: GuideDestination) => a.order - b.order)
  dests.forEach((d, i) => {
    blocks.push({
      id: `legacy-dest-${d.id}`, kind: 'destination',
      heading: d.name, body: d.body,
      freePreview: i < Math.max(0, previewDestinations),
      order: order++,
    })
  })
  const themed = (raw.themedSections ?? []).slice().sort((a: GuideThemedSection, b: GuideThemedSection) => a.order - b.order)
  for (const t of themed) {
    blocks.push({
      id: `legacy-themed-${t.id}`, kind: 'themed',
      heading: t.title, body: t.body, freePreview: false, order: order++,
    })
  }
  if (raw.finalThoughts?.body?.trim()) {
    blocks.push({
      id: 'legacy-final', kind: 'closing', heading: 'Final thoughts',
      body: raw.finalThoughts.body, freePreview: false, order: order++,
    })
  }
  return blocks
}

function normaliseRow(row: unknown): GuideRow {
  const r = row as Record<string, unknown>
  const rawSections = (r.sections ?? {}) as GuideSections
  const country = (r.country as string | null) ?? null
  const previewDestinations = Number(r.preview_destinations ?? 1)

  // Prefer new `blocks` shape. Fall back to legacy migration.
  const blocks: GuideContentBlock[] = Array.isArray(rawSections.blocks) && rawSections.blocks.length > 0
    ? rawSections.blocks.slice().sort((a, b) => a.order - b.order)
    : migrateLegacyToBlocks(rawSections, country, previewDestinations)

  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    subtitle: (r.subtitle as string | null) ?? null,
    country,
    cover_image: (r.cover_image as string | null) ?? null,
    status: (r.status as GuideRow['status']) ?? 'draft',
    is_premium: Boolean(r.is_premium),
    price_pence: Number(r.price_pence ?? 0),
    tags: (r.tags as string[]) ?? [],
    intro_markdown: typeof r.intro_markdown === 'string' ? r.intro_markdown : '',
    body_markdown: typeof r.body_markdown === 'string' ? r.body_markdown : '',
    preview_percent: typeof r.preview_percent === 'number'
      ? Math.max(0, Math.min(100, Math.round(r.preview_percent)))
      : 25,
    pdf_path: (r.pdf_path as string | null) ?? null,
    sections: { blocks, hideAbout: !!rawSections.hideAbout },
    preview_destinations: previewDestinations,
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
