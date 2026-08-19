// Matches recommendations to a blog post about the same specific
// place, not just the same country — e.g. a "Jaya Restoran" food
// recommendation links to the blog post about Jaya Restoran, not just
// any Malaysia post.
//
// Two ways to match, tried in order:
//  1. Place ID — both sides were set via the same Google Places
//     search picker (RecommendationForm / PlaceSearchPicker), so their
//     Maps links share an identifier. Exact and reliable, tried first.
//  2. Place name — exact (trimmed, case-insensitive) match on
//     blog_posts.place_name within the same country. Fallback for
//     older posts that predate the Maps-link picker.
// Same "no fuzzy guessing" stance as resolveCountrySlug in
// related-content.ts — better to show no link than a wrong one.

import { createClient } from '@/lib/supabase/server'
import { getPackByIso2 } from '@/lib/adventurePackMeta'
import { extractPlaceId } from '@/lib/google-places'

export type RecommendationBlogLink = { slug: string; title: string }

type BlogLink = { url: string; label: string }

function normalise(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

function blogPostPlaceId(links: unknown): string | null {
  if (!Array.isArray(links)) return null
  const mapsLink = (links as BlogLink[]).find(l => normalise(l.label) === 'google maps')
  return mapsLink ? extractPlaceId(mapsLink.url) : null
}

export async function getBlogLinksForRecommendations(
  recs: Array<{ id: string; place_name: string; iso2: string; google_maps_url?: string | null }>,
): Promise<Map<string, RecommendationBlogLink>> {
  const map = new Map<string, RecommendationBlogLink>()
  const countrySlugs = [...new Set(recs.map(r => getPackByIso2(r.iso2)?.slug).filter((s): s is string => !!s))]
  if (countrySlugs.length === 0) return map

  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('slug, title, place_name, destination_country, links')
    .eq('status', 'published')
    .in('destination_country', countrySlugs)
  const posts = (data ?? []) as Array<{
    slug: string; title: string; place_name: string | null; destination_country: string | null; links: unknown
  }>
  if (posts.length === 0) return map

  for (const r of recs) {
    const countrySlug = getPackByIso2(r.iso2)?.slug
    if (!countrySlug) continue
    const candidates = posts.filter(p => p.destination_country === countrySlug)

    const recPlaceId = extractPlaceId(r.google_maps_url)
    const byId = recPlaceId ? candidates.find(p => blogPostPlaceId(p.links) === recPlaceId) : undefined
    if (byId) { map.set(r.id, { slug: byId.slug, title: byId.title }); continue }

    const byName = candidates.find(p => p.place_name && normalise(p.place_name) === normalise(r.place_name))
    if (byName) map.set(r.id, { slug: byName.slug, title: byName.title })
  }
  return map
}
