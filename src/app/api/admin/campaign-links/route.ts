import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { createCampaignLink } from '@/lib/campaign-links-db'

export const dynamic = 'force-dynamic'

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminEmail(user?.email)
}

// Short codes double as the URL segment (jaxfamilytravels.com/l/CODE),
// keep them URL-safe. Letters, numbers, hyphens only.
const CODE_RE = /^[a-z0-9-]+$/

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as
    | { code?: string; guideSlug?: string; label?: string | null; sentCount?: number | null; discountCodeId?: string | null }
    | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : ''
  const guideSlug = typeof body.guideSlug === 'string' ? body.guideSlug.trim() : ''
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : null
  const sentCount = typeof body.sentCount === 'number' && Number.isFinite(body.sentCount) && body.sentCount >= 0
    ? Math.round(body.sentCount)
    : null
  const discountCodeId = typeof body.discountCodeId === 'string' && body.discountCodeId ? body.discountCodeId : null

  if (!code || !CODE_RE.test(code)) {
    return NextResponse.json({ error: 'Code must be lowercase letters, numbers, and hyphens only' }, { status: 400 })
  }
  if (!guideSlug) {
    return NextResponse.json({ error: 'Missing guideSlug' }, { status: 400 })
  }

  const result = await createCampaignLink({ code, guideSlug, label, sentCount, discountCodeId })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, code })
}
