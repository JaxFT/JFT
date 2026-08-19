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

function matchSegment(segment: string): string | null {
  const trimmed = segment.trim().toLowerCase()
  if (!trimmed) return null
  const bySlug = PACK_META.find(p => p.slug === trimmed)
  if (bySlug) return bySlug.slug
  const byName = PACK_META.find(p => p.country.toLowerCase() === trimmed)
  return byName?.slug ?? null
}

// Web guides' `country` field is free text and sometimes carries extra
// context beyond the country itself, e.g. "Sri-Lanka, Transport" or
// "Thailand / Bangkok / Things to do". Try the whole string first, then
// fall back to splitting on comma/slash and matching each segment, so a
// clean country name buried in the string still resolves. Segments are
// still checked against the exact known-country list, never fuzzy
// matched, so an unrelated tag can't accidentally produce a match.
export function resolveCountrySlug(value: string | null | undefined): string | null {
  if (!value) return null
  const whole = matchSegment(value)
  if (whole) return whole
  for (const segment of value.split(/[,/]/)) {
    const match = matchSegment(segment)
    if (match) return match
  }
  return null
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

export type RelatedGuideCard = {
  slug: string
  title: string
  cover_image: string | null
  price_pence: number
  is_premium: boolean
}

// For a guide page's own "other guides covering this country" section,
// e.g. the Sri Lanka PDF guide linking to the separate Sri Lanka tuk-tuk
// web guide, and vice versa. Excludes the guide the visitor is already
// on. Unlike findGuideForCountrySlug (single best match for a blog post),
// this returns every other guide for the country across both tables.
export async function findOtherGuidesForCountrySlug(
  countrySlug: string,
  excludeSlug?: string,
): Promise<RelatedGuideCard[]> {
  const [webGuides, pdfGuides] = await Promise.all([listPublishedWebGuides(), listActiveGuides()])

  const web = webGuides
    .filter(g => g.slug !== excludeSlug && resolveCountrySlug(g.country) === countrySlug)
    .map(g => ({ slug: g.slug, title: g.title, cover_image: g.cover_image, price_pence: g.price_pence, is_premium: g.is_premium }))

  // Legacy PDF guides predate the `is_premium` column (it only exists
  // on the newer `guides` table), but every legacy guide IS included
  // in Premium — same as web guides, see guides/[slug]/page.tsx's
  // canViewFull check, which never gates a PDF guide behind its own
  // is_premium flag the way it does for web guides. Hardcoded true,
  // not false, to reflect that.
  const pdf = pdfGuides
    .filter(g => g.slug !== excludeSlug && resolveCountrySlugFromTags(g.tags) === countrySlug)
    .map(g => ({ slug: g.slug, title: g.name, cover_image: g.cover_image, price_pence: g.price_pence, is_premium: true }))

  return [...web, ...pdf]
}
