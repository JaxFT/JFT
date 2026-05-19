import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPackMeta } from '@/lib/adventurePackData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PATCH /api/family/children/[id]/journal/[entry_id]
// Edit an entry. If the entry was originally created by the kid,
// flag parent_edited so the kid view can show transparency.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; entry_id: string }> },
) {
  const { id, entry_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: {
    text?: string; emoji_rating?: string;
    country_slug?: string | null
  } = {}
  try { body = await request.json() } catch {}

  // Look up the existing entry to know whether to set parent_edited.
  const { data: existing } = await supabase
    .from('journal_entries')
    .select('id, created_by')
    .eq('id', entry_id)
    .eq('child_id', id)
    .maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Entry not found.' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.text === 'string') {
    const trimmed = body.text.trim()
    update.text = trimmed ? trimmed.slice(0, 5000) : null
  }
  if (typeof body.emoji_rating === 'string') {
    const trimmed = body.emoji_rating.trim()
    update.emoji_rating = trimmed ? trimmed.slice(0, 16) : null
  }
  if (body.country_slug === null) {
    update.country_slug = null
  } else if (typeof body.country_slug === 'string' && body.country_slug.length > 0) {
    if (!getPackMeta(body.country_slug)) {
      return NextResponse.json({ error: 'Unknown country.' }, { status: 400 })
    }
    update.country_slug = body.country_slug
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }
  // Flag transparency only when a parent edits a kid-written entry.
  if (existing.created_by === 'kid') {
    update.parent_edited = true
  }

  const { error } = await supabase
    .from('journal_entries')
    .update(update)
    .eq('id', entry_id)
    .eq('child_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/family/children/[id]/journal/[entry_id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; entry_id: string }> },
) {
  const { id, entry_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entry_id)
    .eq('child_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
