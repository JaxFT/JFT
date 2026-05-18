import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { slugifyForGuide } from '@/lib/guide-types'
import type { GuideSections } from '@/lib/guide-types'

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
  subtitle?: string | null
  country?: string | null
  cover_image?: string | null
  tags?: string[]
  status?: 'draft' | 'published'
  is_premium?: boolean
  price_pence?: number
  preview_destinations?: number
  // NEW single-doc model
  body_markdown?: string
  intro_markdown?: string
  preview_percent?: number
  // Either full section blob, or a single-key patch. We accept both.
  sections?: GuideSections
  // Convenience: patch a single named section without sending the rest.
  // The server reads the current row, merges, then writes.
  sectionPatch?: Partial<GuideSections>
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

  // Build the update object from primitive fields first.
  const update: Record<string, unknown> = {}
  if (typeof body.title === 'string')        update.title = body.title.trim() || 'Untitled guide'
  if (typeof body.slug === 'string')         update.slug = slugifyForGuide(body.slug)
  if (body.subtitle !== undefined)           update.subtitle = body.subtitle ?? null
  if (body.country !== undefined)            update.country = body.country ?? null
  if (body.cover_image !== undefined)        update.cover_image = body.cover_image ?? null
  if (Array.isArray(body.tags))              update.tags = body.tags
  if (typeof body.is_premium === 'boolean')  update.is_premium = body.is_premium
  if (typeof body.price_pence === 'number')  update.price_pence = Math.max(0, Math.floor(body.price_pence))
  if (typeof body.preview_destinations === 'number') {
    update.preview_destinations = Math.max(0, Math.min(20, Math.floor(body.preview_destinations)))
  }
  if (typeof body.body_markdown === 'string') update.body_markdown = body.body_markdown
  if (typeof body.intro_markdown === 'string') update.intro_markdown = body.intro_markdown
  if (typeof body.preview_percent === 'number') {
    update.preview_percent = Math.max(0, Math.min(100, Math.floor(body.preview_percent)))
  }
  if (body.status === 'draft' || body.status === 'published') {
    update.status = body.status
    if (body.status === 'published') update.published_at = new Date().toISOString()
  }

  // Handle sections: full overwrite OR per-key merge.
  if (body.sections && typeof body.sections === 'object') {
    update.sections = body.sections
  } else if (body.sectionPatch && typeof body.sectionPatch === 'object') {
    // Read current sections, merge, write back.
    const { data: existing, error: readErr } = await auth.supabase
      .from('guides')
      .select('sections')
      .eq('id', id)
      .single()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    const current = (existing?.sections ?? {}) as GuideSections
    update.sections = { ...current, ...body.sectionPatch }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields supplied' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('guides')
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

  const { error } = await auth.supabase.from('guides').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
