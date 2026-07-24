import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminEmail(user?.email)
}

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Toggle active on/off. Everything else about a code (percent, cap,
// scope) is fixed at creation, editing those after the fact could
// invalidate reservations already made against the old terms.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  }
  const { id } = await params
  const body = await request.json().catch(() => null) as { active?: boolean } | null
  if (!body || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { data, error } = await adminClient()
    .from('discount_codes')
    .update({ active: body.active })
    .eq('id', id)
    .select('id, active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ code: data })
}
