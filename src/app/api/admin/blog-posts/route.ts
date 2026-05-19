import { NextResponse } from 'next/server'
import matter from 'gray-matter'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { slugify, type BlogCategory, type BlogLink } from '@/lib/blog-db'
import {
  sanitizeTravelStages, sanitizeBlogTopics, sanitizeDestinationCountry,
} from '@/lib/blog-meta'
import { PACK_META } from '@/lib/adventurePackMeta'

const VALID_CATEGORIES: BlogCategory[] = ['accommodation', 'restaurant', 'bar', 'activity', 'general']
const VALID_DESTINATION_SLUGS = PACK_META.map(p => p.slug)

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false as const, supabase, user: null }
  return { ok: true as const, supabase, user }
}

// Coerce / validate raw incoming `links` into a clean BlogLink[] array.
// Drops entries without a usable URL. Defaults missing labels to "Website".
function cleanLinks(raw: unknown): BlogLink[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(x => (typeof x === 'object' && x !== null ? x as Record<string, unknown> : null))
    .filter((x): x is Record<string, unknown> => !!x)
    .map(x => ({
      url: typeof x.url === 'string' ? x.url.trim() : '',
      label: typeof x.label === 'string' && x.label.trim() ? x.label.trim() : 'Website',
    }))
    .filter(x => x.url.length > 0)
}

// Validate trip_date: must be ISO yyyy-mm-dd or null.
function cleanTripDate(raw: unknown): string | null {
  if (raw === null || raw === '') return null
  if (typeof raw !== 'string') return null
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
}

function cleanTargetMinutes(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (Number.isNaN(n)) return null
  return Math.max(1, Math.min(20, Math.round(n)))
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const body = await request.json().catch(() => null) as
    | {
        markdown?: string
        title?: string
        category?: string | null
        place_name?: string | null
        place_link?: string | null     // legacy single-link
        links?: unknown                 // new multi-link
        trip_date?: string | null
        target_minutes?: number | null
        travel_stages?: unknown
        destination_country?: string | null
        topics?: unknown
      }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const category: BlogCategory | null =
    typeof body.category === 'string' && VALID_CATEGORIES.includes(body.category as BlogCategory)
      ? (body.category as BlogCategory)
      : null
  const placeName = typeof body.place_name === 'string' && body.place_name.trim() ? body.place_name.trim() : null
  const placeLink = typeof body.place_link === 'string' && body.place_link.trim() ? body.place_link.trim() : null
  const links = cleanLinks(body.links)
  const tripDate = cleanTripDate(body.trip_date)
  const targetMinutes = cleanTargetMinutes(body.target_minutes)
  const travelStages = sanitizeTravelStages(body.travel_stages)
  const destinationCountry = sanitizeDestinationCountry(body.destination_country, VALID_DESTINATION_SLUGS)
  const topics = sanitizeBlogTopics(body.topics)

  let title = (body.title ?? '').trim()
  let excerpt: string | null = null
  let coverImage: string | null = null
  let tags: string[] = []
  let bodyMd = ''

  if (typeof body.markdown === 'string' && body.markdown.trim().length > 0) {
    const stripped = body.markdown
      .trim()
      .replace(/^```(?:markdown|md)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
    const parsed = matter(stripped)
    const fm = parsed.data as Record<string, unknown>
    if (!title && typeof fm.title === 'string') title = fm.title
    if (typeof fm.excerpt === 'string') excerpt = fm.excerpt
    if (typeof fm.coverImage === 'string') coverImage = fm.coverImage
    if (Array.isArray(fm.tags)) tags = fm.tags.filter((t): t is string => typeof t === 'string')
    bodyMd = parsed.content.trim()
  }

  if (!title) title = 'Untitled draft'

  const baseSlug = slugify(title)
  let slug = baseSlug
  for (let i = 2; i < 30; i++) {
    const { data } = await auth.supabase.from('blog_posts').select('id').eq('slug', slug).maybeSingle()
    if (!data) break
    slug = `${baseSlug}-${i}`
  }

  const insert = {
    slug,
    title,
    excerpt,
    body_markdown: bodyMd,
    cover_image: coverImage,
    tags,
    category,
    place_name: placeName,
    place_link: placeLink,
    links,
    trip_date: tripDate,
    target_minutes: targetMinutes,
    travel_stages: travelStages,
    destination_country: destinationCountry,
    topics,
    status: 'draft',
    created_by: auth.user.id,
  }

  const { data, error } = await auth.supabase
    .from('blog_posts')
    .insert(insert)
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data!.id, slug: data!.slug })
}
