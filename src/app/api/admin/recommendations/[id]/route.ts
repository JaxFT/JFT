// Admin-only toggle for pinning a recommendation into the "4
// highlights" default view on /recommendations. Deliberately separate
// from the owner-edit PATCH on /api/recommendations — that one
// requires the full form payload (place name, category, etc) and is
// scoped to the row's own author (or an admin editing another
// admin's row); this one is a single boolean flip any admin can do on
// any row, mirroring /api/admin/blog-posts/[id]'s homepage_featured
// handling.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { MAX_RECOMMENDATIONS_FEATURED } from '@/components/recommendations/types'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const { id } = await params
  const body = (await request.json().catch(() => null)) as { homepage_featured?: boolean } | null
  if (!body || typeof body.homepage_featured !== 'boolean') {
    return NextResponse.json({ error: 'homepage_featured must be true or false' }, { status: 400 })
  }

  if (body.homepage_featured) {
    const { data: featured } = await supabase
      .from('recommendations')
      .select('id')
      .eq('homepage_featured', true)
    const ids = (featured ?? []).map(r => r.id)
    if (!ids.includes(id) && ids.length >= MAX_RECOMMENDATIONS_FEATURED) {
      return NextResponse.json(
        { error: `Only ${MAX_RECOMMENDATIONS_FEATURED} recommendations can be featured at once. Unpin one first.` },
        { status: 400 },
      )
    }
  }

  const { data, error } = await supabase
    .from('recommendations')
    .update({ homepage_featured: body.homepage_featured })
    .eq('id', id)
    .select('id, homepage_featured')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, recommendation: data })
}
