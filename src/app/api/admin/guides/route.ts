import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { slugifyForGuide } from '@/lib/guide-types'
import { emptySections } from '@/lib/guide-types'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false as const, supabase, user: null }
  return { ok: true as const, supabase, user }
}

// POST creates an empty draft from a country + title. Everything else
// is filled in as the wizard progresses via PATCH on /api/admin/guides/[id].
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as
    | { title?: string; country?: string }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const title = (body.title ?? '').trim() || 'Untitled guide'
  const country = (body.country ?? '').trim() || null

  // Ensure unique slug
  const baseSlug = slugifyForGuide(title)
  let slug = baseSlug
  for (let i = 2; i < 30; i++) {
    const { data } = await auth.supabase.from('guides').select('id').eq('slug', slug).maybeSingle()
    if (!data) break
    slug = `${baseSlug}-${i}`
  }

  const insert = {
    slug,
    title,
    country,
    sections: emptySections(),
    status: 'draft',
    is_premium: true,
    price_pence: 0,
    tags: [] as string[],
    created_by: auth.user.id,
  }

  const { data, error } = await auth.supabase
    .from('guides')
    .insert(insert)
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data!.id, slug: data!.slug })
}
