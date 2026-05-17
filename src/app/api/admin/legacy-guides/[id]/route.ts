import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// Tiny admin endpoint for the legacy PDF guide rows that live in
// `products`. The wizard-driven new guides have their own /api/admin/guides.
// All this endpoint does is let the admin flip `active` on / off so a
// PDF guide can be hidden from the public listing without going into
// Supabase. Optionally also lets the subtitle be edited.

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
    | { active?: boolean; subtitle?: string | null }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof body.active === 'boolean') update.active = body.active
  if (body.subtitle !== undefined) {
    update.subtitle = body.subtitle === null
      ? null
      : String(body.subtitle).trim() || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields supplied' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('products')
    .update(update)
    .eq('id', id)
    .eq('type', 'guide')
    .select('id, slug, active, subtitle')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
