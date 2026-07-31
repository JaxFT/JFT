import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { addYears } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { findUserIdByEmail } from '@/lib/find-user-by-email'
import { sendEmail, buildPremiumGiftEmail } from '@/lib/email'
import { notifyWaystaqPremiumAccess } from '@/lib/waystaq-premium-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function requireAdmin(): Promise<{ ok: boolean; email: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { ok: isAdminEmail(user?.email), email: user?.email ?? null }
}

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Lists past gifts, newest first, with the recipient's email resolved
// from auth.users (profiles doesn't store email).
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const admin = adminClient()
  const { data: gifts, error } = await admin
    .from('premium_gifts')
    .select('id, user_id, granted_by, granted_at, expires_at, note, revoked_at')
    .order('granted_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const resolved = await Promise.all(
    (gifts ?? []).map(async g => {
      const { data } = await admin.auth.admin.getUserById(g.user_id)
      return { ...g, email: data.user?.email ?? null }
    }),
  )
  return NextResponse.json({ gifts: resolved })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok || !auth.email) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as { email?: string; note?: string } | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const admin = adminClient()
  const userId = await findUserIdByEmail(admin, email)
  if (!userId) {
    return NextResponse.json(
      { error: 'No account found for that email yet. Ask them to sign up first, then gift again.' },
      { status: 404 },
    )
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, subscription_tier, stripe_subscription_id')
    .eq('id', userId)
    .maybeSingle()

  const expiresAt = addYears(new Date(), 1).toISOString()

  // Deliberately leaves stripe_customer_id/stripe_subscription_id
  // untouched, so this can never be confused for, or clobbered by,
  // a real Stripe subscription. See supabase/premium-gifts.sql.
  const { error: updateError } = await admin
    .from('profiles')
    .update({ subscription_tier: 'premium', subscription_expires_at: expiresAt })
    .eq('id', userId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { error: giftError } = await admin
    .from('premium_gifts')
    .insert({ user_id: userId, granted_by: auth.email, expires_at: expiresAt, note })
  if (giftError) return NextResponse.json({ error: giftError.message }, { status: 500 })

  // Gifted Premium never generates a Stripe event, so WayStaq's own
  // webhook-driven grant (for real subscribers) never fires for this
  // account. Tell it directly instead, best-effort.
  await notifyWaystaqPremiumAccess(email, 'grant', expiresAt)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  const emailContent = buildPremiumGiftEmail({ name: profile?.full_name ?? null, expiresAt, siteUrl })
  await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text })

  const alreadyRealSubscriber = profile?.subscription_tier === 'premium' && !!profile?.stripe_subscription_id
  return NextResponse.json({
    ok: true,
    userId,
    email,
    expiresAt,
    warning: alreadyRealSubscriber
      ? 'This account already has a real paying Premium subscription. The gift was recorded, but their access was already active.'
      : null,
  })
}
