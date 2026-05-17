import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false as const, supabase, user: null }
  return { ok: true as const, supabase, user }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  const { data, error } = await auth.supabase
    .from('blog_auto_links')
    .select('id, phrase, url, note, created_at')
    .order('phrase', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as
    | { phrase?: string; url?: string; note?: string }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const phrase = typeof body.phrase === 'string' ? body.phrase.trim() : ''
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
  if (!phrase) return NextResponse.json({ error: 'Phrase is required' }, { status: 400 })
  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  const { data, error } = await auth.supabase
    .from('blog_auto_links')
    .insert({ phrase, url, note, created_by: auth.user.id })
    .select('id, phrase, url, note, created_at')
    .single()

  if (error) {
    const msg = /duplicate|unique/i.test(error.message)
      ? `A link for "${phrase}" already exists.`
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ link: data })
}
