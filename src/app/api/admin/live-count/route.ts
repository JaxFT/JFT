import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, EXCLUDED_FROM_USER_COUNTS } from '@/lib/admin'
import { getLiveSessionCount } from '@/lib/live-sessions-db'

export const dynamic = 'force-dynamic'

function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Admin-only stats for the live-traffic card:
//   - browsers: tabs heartbeating in the last 60s
//   - premiumUsers: total premium-tier profiles
//   - freeUsers:    total non-premium profiles
// Returns 404 to non-admins so the endpoint doesn't even hint at existing.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    const sb = admin()
    // Find the admin user ids so we can exclude them from both count
    // queries. ADMIN_EMAILS is a tiny list; listUsers fetches up to
    // 1000 users in one page which covers any realistic team size.
    // Falls through to an empty array on auth-admin errors so the
    // counts still render (just without the exclusion).
    let adminIds: string[] = []
    try {
      const { data } = await sb.auth.admin.listUsers({ perPage: 1000 })
      adminIds = (data?.users ?? [])
        .filter(u => isAdminEmail(u.email))
        .map(u => u.id)
    } catch (e) {
      console.error('[live-count] listUsers', e)
    }

    const totalQ = sb.from('profiles').select('id', { count: 'exact', head: true })
    // ilike for 'premium' so values like "Premium" / "PREMIUM" still
    // count. Trailing-whitespace edge cases will under-count slightly
    // but that's rare enough to ignore.
    const premiumQ = sb.from('profiles').select('id', { count: 'exact', head: true }).ilike('subscription_tier', 'premium')
    // Exclude admin profiles AND hand-picked test/dummy accounts from
    // both counts so the headline numbers reflect real members only.
    const excludedIds = [...adminIds, ...EXCLUDED_FROM_USER_COUNTS]
    if (excludedIds.length > 0) {
      // PostgREST not-in syntax: not.in.(id1,id2,...)
      const csv = `(${excludedIds.join(',')})`
      totalQ.not('id', 'in', csv)
      premiumQ.not('id', 'in', csv)
    }

    const [browsers, totalRes, premiumRes] = await Promise.all([
      getLiveSessionCount(),
      totalQ,
      premiumQ,
    ])
    const totalUsers = totalRes.count ?? 0
    const premiumUsers = premiumRes.count ?? 0
    const freeUsers = Math.max(0, totalUsers - premiumUsers)
    // Admin browsers self-exclude (LiveHeartbeat skips pinging when
    // the viewer is an admin), so the live count is already
    // admin-free without filtering here.
    return NextResponse.json({ count: browsers, freeUsers, premiumUsers })
  } catch (err) {
    console.error('[live-count]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
