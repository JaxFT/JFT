import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { getLiveSessionCount } from '@/lib/live-sessions-db'

export const dynamic = 'force-dynamic'

// Admin-only count of browser tabs that have heartbeated in the last
// 60s. Returns 404 to non-admins so the endpoint doesn't even hint
// at existing.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    const count = await getLiveSessionCount()
    return NextResponse.json({ count })
  } catch (err) {
    console.error('[live-count]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
