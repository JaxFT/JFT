import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPackMeta } from '@/lib/adventurePackData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/family/children/[id]/assignments
// Body: { country_slug: string }
// Assign an Adventure Pack to a child. RLS scopes the write to packs
// the parent owns the child for. We validate country_slug against the
// known PACK_META so the parent can't assign packs we don't have data
// for.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  }

  let body: { country_slug?: string } = {}
  try { body = await request.json() } catch {}
  const slug = typeof body.country_slug === 'string' ? body.country_slug : ''
  if (!getPackMeta(slug)) {
    return NextResponse.json({ error: 'Unknown country pack.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('child_pack_assignments')
    .upsert({ child_id: id, country_slug: slug }, { onConflict: 'child_id,country_slug' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
