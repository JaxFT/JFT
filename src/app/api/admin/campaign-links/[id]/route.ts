import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { setCampaignLinkActive, setCampaignLinkSentCount } from '@/lib/campaign-links-db'

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

  const body = (await request.json().catch(() => null)) as { active?: boolean; sentCount?: number | null } | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  if (typeof body.active === 'boolean') {
    await setCampaignLinkActive(id, body.active)
  }
  if (body.sentCount !== undefined) {
    const sentCount = typeof body.sentCount === 'number' && Number.isFinite(body.sentCount) && body.sentCount >= 0
      ? Math.round(body.sentCount)
      : null
    await setCampaignLinkSentCount(id, sentCount)
  }
  if (typeof body.active !== 'boolean' && body.sentCount === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
