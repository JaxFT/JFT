import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { slugify, type BlogCategory, type BlogLink } from '@/lib/blog-db'
import {
  sanitizeTravelStages, sanitizeBlogTopics, sanitizeDestinationCountry,
} from '@/lib/blog-meta'
import { PACK_META } from '@/lib/adventurePackMeta'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES: BlogCategory[] = ['accommodation', 'restaurant', 'bar', 'activity', 'general']
const VALID_DESTINATION_SLUGS = PACK_META.map(p => p.slug)

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) return { ok: false as const, supabase }
  return { ok: true as const, supabase }
}

type UpdateBody = {
  title?: string
  slug?: string
  excerpt?: string | null
  body_markdown?: string
  cover_image?: string | null
  cover_focal_x?: number
  cover_focal_y?: number
  tags?: string[]
  status?: 'draft' | 'published'
  is_premium?: boolean
  category?: string | null
  place_name?: string | null
  place_link?: string | null
  links?: unknown
  trip_date?: string | null
  target_minutes?: number | null
  travel_stages?: unknown
  destination_country?: string | null
  topics?: unknown
  published_at?: string | null
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 50
  return Math.max(0, Math.min(100, Math.round(n)))
}

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

// Accept either a yyyy-mm-dd date (treated as midnight UTC) or a full
// ISO timestamp. Returns the timestamptz string Supabase expects.
function cleanPublishedAt(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null || raw === '') return null
  if (typeof raw !== 'string') return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00Z`
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  const { id } = await params
  const body = (await request.json().catch(() => null)) as UpdateBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof body.title === 'string') update.title = body.title.trim() || 'Untitled draft'
  if (typeof body.slug === 'string') update.slug = slugify(body.slug)
  if (body.excerpt !== undefined) update.excerpt = body.excerpt ?? null
  if (typeof body.body_markdown === 'string') update.body_markdown = body.body_markdown
  if (body.cover_image !== undefined) update.cover_image = body.cover_image ?? null
  if (typeof body.cover_focal_x === 'number') update.cover_focal_x = clampPct(body.cover_focal_x)
  if (typeof body.cover_focal_y === 'number') update.cover_focal_y = clampPct(body.cover_focal_y)
  if (Array.isArray(body.tags)) update.tags = body.tags
  if (typeof body.is_premium === 'boolean') update.is_premium = body.is_premium
  if (body.category !== undefined) {
    if (body.category === null || body.category === '') {
      update.category = null
    } else if (VALID_CATEGORIES.includes(body.category as BlogCategory)) {
      update.category = body.category
    }
  }
  if (body.place_name !== undefined) {
    const v = body.place_name === null ? null : String(body.place_name).trim()
    update.place_name = v ? v : null
  }
  if (body.place_link !== undefined) {
    const v = body.place_link === null ? null : String(body.place_link).trim()
    update.place_link = v ? v : null
  }
  if (body.links !== undefined) {
    update.links = cleanLinks(body.links)
  }
  if (body.trip_date !== undefined) {
    update.trip_date = cleanTripDate(body.trip_date)
  }
  if (body.target_minutes !== undefined) {
    update.target_minutes = cleanTargetMinutes(body.target_minutes)
  }
  if (body.travel_stages !== undefined) {
    update.travel_stages = sanitizeTravelStages(body.travel_stages)
  }
  if (body.destination_country !== undefined) {
    update.destination_country = sanitizeDestinationCountry(body.destination_country, VALID_DESTINATION_SLUGS)
  }
  if (body.topics !== undefined) {
    update.topics = sanitizeBlogTopics(body.topics)
  }

  // Published-at + status interaction:
  //   - explicit published_at always wins (lets the user backdate)
  //   - otherwise, transitioning to 'published' sets it to now
  //   - transitioning to 'draft' leaves the old timestamp in place so
  //     unpublishing then republishing preserves the originally-set date.
  const explicitPublishedAt = cleanPublishedAt(body.published_at)
  if (explicitPublishedAt !== undefined) update.published_at = explicitPublishedAt

  if (body.status === 'draft' || body.status === 'published') {
    update.status = body.status
    if (body.status === 'published' && explicitPublishedAt === undefined) {
      // Only auto-stamp if no explicit date was provided and the row
      // hasn't been published before.
      const { data: existing } = await auth.supabase
        .from('blog_posts')
        .select('published_at')
        .eq('id', id)
        .single()
      if (!existing?.published_at) {
        update.published_at = new Date().toISOString()
      }
    }
  }

  const { data, error } = await auth.supabase
    .from('blog_posts')
    .update(update)
    .eq('id', id)
    .select('id, slug, status, published_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  const { id } = await params

  const { error } = await auth.supabase.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
