import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPackMeta } from '@/lib/adventurePackData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/family/children/[id]/journal
// Body: { text?, emoji_rating?, country_slug?, created_at? }
// Parent creates a journal entry on behalf of (or about) the child.
// Useful in view-only mode where the kid can't write themselves, or
// when backdating a memory from before the family started using JFT.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: {
    text?: string; emoji_rating?: string;
    country_slug?: string | null; created_at?: string
  } = {}
  try { body = await request.json() } catch {}

  const text = body.text?.trim() ? body.text.trim().slice(0, 5000) : null
  const emoji = body.emoji_rating?.trim() ? body.emoji_rating.trim().slice(0, 16) : null
  if (!text && !emoji) {
    return NextResponse.json({ error: 'Add some text or an emoji rating.' }, { status: 400 })
  }

  let countrySlug: string | null = null
  if (body.country_slug) {
    if (!getPackMeta(body.country_slug)) {
      return NextResponse.json({ error: 'Unknown country.' }, { status: 400 })
    }
    countrySlug = body.country_slug
  }

  // Allow backdated created_at if it parses as a real date.
  let createdAt: string | undefined
  if (body.created_at) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(body.created_at)) {
      const d = new Date(body.created_at + 'T12:00:00Z')
      if (!Number.isNaN(d.getTime())) createdAt = d.toISOString()
    } else {
      const d = new Date(body.created_at)
      if (!Number.isNaN(d.getTime())) createdAt = d.toISOString()
    }
  }

  const insert: Record<string, unknown> = {
    child_id: id,
    country_slug: countrySlug,
    text,
    emoji_rating: emoji,
    created_by: 'parent',
  }
  if (createdAt) insert.created_at = createdAt

  const { data, error } = await supabase
    .from('journal_entries')
    .insert(insert)
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
