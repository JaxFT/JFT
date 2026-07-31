import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { notifyWaystaqPremiumAccess } from '@/lib/waystaq-premium-access'

// ONE-OFF backfill, safe to delete this file once it's been run once.
//
// Grants WayStaq Asia Adventure viewer access to every account that was
// already gifted Premium before notifyWaystaqPremiumAccess() existed
// (2026-07-31). Going forward, /api/admin/gift-premium calls that
// directly on every new gift, so this only needs to run once to catch
// accounts gifted before that hook existed.
//
// Visit this URL directly in the browser while logged in as admin
// (GET, no body needed) to trigger it.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  }

  const admin = adminClient()

  // Gifted premium, still active: real subscription is null and either no
  // expiry or an expiry still in the future. Mirrors expire_gifted_premium()
  // in supabase/premium-gifts.sql.
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, subscription_expires_at')
    .eq('subscription_tier', 'premium')
    .is('stripe_subscription_id', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  const eligible = (profiles ?? []).filter(p =>
    !p.subscription_expires_at || new Date(p.subscription_expires_at).getTime() > now,
  )

  const results: Array<{ email: string; ok: boolean }> = []
  for (const profile of eligible) {
    const { data } = await admin.auth.admin.getUserById(profile.id)
    const email = data.user?.email
    if (!email) {
      results.push({ email: `(no email, id=${profile.id})`, ok: false })
      continue
    }
    // Fall back to 1 year out if a legacy gift somehow has no expiry set.
    const expiresAt = profile.subscription_expires_at
      ?? new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString()
    await notifyWaystaqPremiumAccess(email, 'grant', expiresAt)
    results.push({ email, ok: true })
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
