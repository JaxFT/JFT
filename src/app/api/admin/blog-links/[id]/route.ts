import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) return { ok: false as const, supabase }
  return { ok: true as const, supabase }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  const { id } = await params

  const body = (await request.json().catch(() => null)) as
    | { phrase?: string; url?: string; note?: string | null }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof body.phrase === 'string') {
    const v = body.phrase.trim()
    if (!v) return NextResponse.json({ error: 'Phrase cannot be empty' }, { status: 400 })
    update.phrase = v
  }
  if (typeof body.url === 'string') {
    const v = body.url.trim()
    if (!v) return NextResponse.json({ error: 'URL cannot be empty' }, { status: 400 })
    update.url = v
  }
  if (body.note !== undefined) {
    update.note = body.note === null ? null : String(body.note).trim() || null
  }

  const { data, error } = await auth.supabase
    .from('blog_auto_links')
    .update(update)
    .eq('id', id)
    .select('id, phrase, url, note')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ link: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  const { id } = await params

  const { error } = await auth.supabase.from('blog_auto_links').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
