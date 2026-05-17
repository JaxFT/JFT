import { NextResponse } from 'next/server'
import matter from 'gray-matter'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { slugify, type BlogCategory } from '@/lib/blog-db'

const VALID_CATEGORIES: BlogCategory[] = ['accommodation', 'restaurant', 'bar', 'activity', 'general']

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false as const, supabase, user: null }
  return { ok: true as const, supabase, user }
}

// POST: create a new draft from either raw markdown or structured fields.
// Used by the blog writer iframe (sends `markdown`) and by a future
// "blank draft" button (sends `title`).
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const body = await request.json().catch(() => null) as
    | {
        markdown?: string
        title?: string
        category?: string | null
        place_name?: string | null
        place_link?: string | null
      }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const category: BlogCategory | null =
    typeof body.category === 'string' && VALID_CATEGORIES.includes(body.category as BlogCategory)
      ? (body.category as BlogCategory)
      : null
  const placeName = typeof body.place_name === 'string' && body.place_name.trim() ? body.place_name.trim() : null
  const placeLink = typeof body.place_link === 'string' && body.place_link.trim() ? body.place_link.trim() : null

  let title = (body.title ?? '').trim()
  let excerpt: string | null = null
  let coverImage: string | null = null
  let tags: string[] = []
  let bodyMd = ''

  if (typeof body.markdown === 'string' && body.markdown.trim().length > 0) {
    // Strip outer code fences if the AI wrapped its response (we ask
    // it to, so the user can copy the raw text from ChatGPT/Claude).
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

  let baseSlug = slugify(title)
  let slug = baseSlug
  // Ensure unique slug
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
