// Matches blog posts to guides (and back) by country, for the
// "related content" sections on both. The two are tagged completely
// independently — blog posts store `destination_country` as an
// Adventure Pack slug (see adventurePackMeta.ts, always lowercase,
// e.g. 'sri-lanka'), guides store a free-text `country`/tag typed by
// whoever wrote the guide (e.g. "Sri Lanka"). This resolves either
// form to the canonical pack slug so the two sides can be compared.
//
// Deliberately only resolves against the 35 known Adventure Pack
// countries, no slugify-and-hope fallback for anything else. A tag
// like "Money" or "Beginner" must NOT coincidentally produce a slug
// that matches some blog post's destination_country, better to show
// no related content than a wrong match.

import { PACK_META } from './adventurePackMeta'
import { listPublishedWebGuides } from './guides-content-db'
import { listActiveGuides } from './guides-db'

export function resolveCountrySlug(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  const bySlug = PACK_META.find(p => p.slug === trimmed)
  if (bySlug) return bySlug.slug
  const byName = PACK_META.find(p => p.country.toLowerCase() === trimmed)
  return byName?.slug ?? null
}

// First country match across a guide's tags (used for the legacy PDF
// guides, which have no structured country field, only free-text tags).
export function resolveCountrySlugFromTags(tags: string[]): string | null {
  for (const tag of tags) {
    const slug = resolveCountrySlug(tag)
    if (slug) return slug
  }
  return null
}

export type RelatedGuide = { slug: string; title: string }

// For the blog-post-side link: finds the single best guide covering a
// post's destination country, web guides first (the primary product
// now), falling back to a legacy PDF guide. Both guide lists are
// small (few dozen rows), fetch-and-filter-in-memory is simpler than
// two separate country-aware SQL queries across differently-shaped
// tables, same trade-off as elsewhere in this codebase.
export async function findGuideForCountrySlug(countrySlug: string): Promise<RelatedGuide | null> {
  const webGuides = await listPublishedWebGuides()
  const webMatch = webGuides.find(g => resolveCountrySlug(g.country) === countrySlug)
  if (webMatch) return { slug: webMatch.slug, title: webMatch.title }

  const pdfGuides = await listActiveGuides()
  const pdfMatch = pdfGuides.find(g => resolveCountrySlugFromTags(g.tags) === countrySlug)
  if (pdfMatch) return { slug: pdfMatch.slug, title: pdfMatch.name }

  return null
}
