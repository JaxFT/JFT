import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { setCampaignLinkActive } from '@/lib/campaign-links-db'

export const dynamic = 'force-dynamic'

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminEmail(user?.email)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  const { id } = await params

  const body = (await request.json().catch(() => null)) as { active?: boolean } | null
  if (!body || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Missing active flag' }, { status: 400 })
  }

  await setCampaignLinkActive(id, body.active)
  return NextResponse.json({ ok: true })
}
