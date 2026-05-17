import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { slugify } from '@/lib/blog-db'

export const dynamic = 'force-dynamic'

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
  tags?: string[]
  status?: 'draft' | 'published'
  is_premium?: boolean
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
  if (Array.isArray(body.tags)) update.tags = body.tags
  if (typeof body.is_premium === 'boolean') update.is_premium = body.is_premium
  if (body.status === 'draft' || body.status === 'published') {
    update.status = body.status
    if (body.status === 'published') update.published_at = new Date().toISOString()
  }

  const { data, error } = await auth.supabase
    .from('blog_posts')
    .update(update)
    .eq('id', id)
    .select('id, slug, status')
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
