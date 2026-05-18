import { createClient } from '@/lib/supabase/server'
import type { BlogCategory } from '@/lib/blog-categories'

export { BLOG_CATEGORIES, VALID_BLOG_CATEGORIES } from '@/lib/blog-categories'
export type { BlogCategory } from '@/lib/blog-categories'

export type BlogPostStatus = 'draft' | 'published'

// A labelled outbound link tied to a blog post. The label is the
// human-friendly description ("Booking", "Menu", "Their website") that
// hints to the AI how to phrase the embedded CTA, and is also surfaced
// in the editor so Bec knows what each link is for.
export type BlogLink = {
  url: string
  label: string
}

export type BlogPostRow = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body_markdown: string
  cover_image: string | null
  cover_focal_x: number
  cover_focal_y: number
  tags: string[]
  author: string
  status: BlogPostStatus
  is_premium: boolean
  category: BlogCategory | null
  place_name: string | null
  place_link: string | null    // legacy, migrated into `links` on read
  links: BlogLink[]
  trip_date: string | null     // ISO yyyy-mm-dd, when the family went
  target_minutes: number | null // intended read-time, 1..20
  published_at: string | null
  created_at: string
  updated_at: string
}

// Normalise a raw Supabase row into BlogPostRow. Handles:
//   - links field missing / wrong shape → []
//   - legacy place_link present but links empty → migrate
function normaliseRow(raw: unknown): BlogPostRow {
  const r = raw as Record<string, unknown>
  const rawLinks = Array.isArray(r.links) ? r.links : []
  let links: BlogLink[] = rawLinks
    .map(x => x as { url?: unknown; label?: unknown })
    .filter(x => typeof x.url === 'string' && x.url.trim().length > 0)
    .map(x => ({
      url: String(x.url).trim(),
      label: typeof x.label === 'string' && x.label.trim() ? String(x.label).trim() : 'Website',
    }))

  // Legacy migration: if there's a place_link but no links, surface
  // place_link as the first labelled entry.
  const placeLink = (r.place_link as string | null) ?? null
  if (links.length === 0 && placeLink && placeLink.trim()) {
    const category = r.category as BlogCategory | null
    const defaultLabel =
      category === 'accommodation' ? 'Booking'
      : category === 'restaurant'   ? 'Menu'
      : category === 'bar'          ? 'Website'
      : category === 'activity'     ? 'Tickets'
      : 'Website'
    links = [{ url: placeLink.trim(), label: defaultLabel }]
  }

  const target = r.target_minutes
  const targetMinutes = typeof target === 'number' && target >= 1 && target <= 20
    ? Math.round(target) : null

  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: (r.excerpt as string | null) ?? null,
    body_markdown: (r.body_markdown as string) ?? '',
    cover_image: (r.cover_image as string | null) ?? null,
    cover_focal_x: Number(r.cover_focal_x ?? 50),
    cover_focal_y: Number(r.cover_focal_y ?? 50),
    tags: (r.tags as string[]) ?? [],
    author: (r.author as string) ?? 'Jax Family Travels',
    status: (r.status as BlogPostStatus) ?? 'draft',
    is_premium: Boolean(r.is_premium),
    category: (r.category as BlogCategory | null) ?? null,
    place_name: (r.place_name as string | null) ?? null,
    place_link: placeLink,
    links,
    trip_date: (r.trip_date as string | null) ?? null,
    target_minutes: targetMinutes,
    published_at: (r.published_at as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }
}

export async function listPublishedPosts(): Promise<BlogPostRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return (data ?? []).map(normaliseRow)
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPostRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return data ? normaliseRow(data) : null
}

export async function listAllPostsForAdmin(): Promise<BlogPostRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .order('updated_at', { ascending: false })
  return (data ?? []).map(normaliseRow)
}

export async function getPostById(id: string): Promise<BlogPostRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data ? normaliseRow(data) : null
}

const WORDS_PER_MIN = 200

export function readingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MIN))
}

export function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}

export type BlogPostView = {
  slug: string
  title: string
  excerpt: string
  date: string
  tripDate: string | null
  author: string
  coverImage: string
  coverFocalX: number
  coverFocalY: number
  tags: string[]
  content: string
  readTime: number
  isPremium: boolean
  links: BlogLink[]
}

export function rowToView(row: BlogPostRow): BlogPostView {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? '',
    date: row.published_at ?? row.created_at,
    tripDate: row.trip_date,
    author: row.author,
    coverImage: row.cover_image ?? '',
    coverFocalX: row.cover_focal_x ?? 50,
    coverFocalY: row.cover_focal_y ?? 50,
    tags: row.tags,
    content: row.body_markdown,
    readTime: readingTimeMinutes(row.body_markdown),
    isPremium: row.is_premium,
    links: row.links,
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || `post-${Date.now()}`
}
