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

// Revoke a gift early: drops the recipient back to free (unless
// they've since taken out a real Stripe subscription, in which case
// there's nothing to revoke, real access stands) and stamps revoked_at.
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  }
  const { id } = await params
  const admin = adminClient()

  const { data: gift, error: giftError } = await admin
    .from('premium_gifts')
    .select('user_id, revoked_at')
    .eq('id', id)
    .maybeSingle()
  if (giftError) return NextResponse.json({ error: giftError.message }, { status: 500 })
  if (!gift) return NextResponse.json({ error: 'Gift not found' }, { status: 404 })
  if (gift.revoked_at) return NextResponse.json({ ok: true })

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', gift.user_id)
    .maybeSingle()
  if (!profile?.stripe_subscription_id) {
    const { error: profileError } = await admin
      .from('profiles')
      .update({ subscription_tier: 'free', subscription_expires_at: null })
      .eq('id', gift.user_id)
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const { error: revokeError } = await admin
    .from('premium_gifts')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
  if (revokeError) return NextResponse.json({ error: revokeError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
