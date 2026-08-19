// One-off admin utility: adds Bec as a travel buddy for every existing
// account that doesn't already have her, both directions (buddies are
// reciprocal, see /api/travel-profile/buddies), same relationship new
// signups now get automatically via /api/auth/welcome. Safe to run
// more than once, existing pairs are skipped via the unique
// constraint. GET (not POST) is deliberate here — this is meant to be
// triggered by an admin just visiting the URL once in their browser,
// not wired into any UI.

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { findUserIdByEmail } from '@/lib/find-user-by-email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_BUDDY_EMAIL = 'jaxfamilytravels7@gmail.com'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const becId = await findUserIdByEmail(admin, DEFAULT_BUDDY_EMAIL)
  if (!becId) return NextResponse.json({ error: 'No account found for the default buddy email' }, { status: 400 })

  const { data: allProfiles, error: profilesError } = await admin.from('profiles').select('id')
  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })

  const otherIds = (allProfiles ?? []).map(p => p.id as string).filter(id => id !== becId)
  const rows = otherIds.flatMap(id => [
    { user_id: id, buddy_user_id: becId },
    { user_id: becId, buddy_user_id: id },
  ])

  if (rows.length === 0) return NextResponse.json({ ok: true, added: 0 })

  const { error: insertError } = await admin
    .from('travel_profile_buddies')
    .upsert(rows, { onConflict: 'user_id,buddy_user_id', ignoreDuplicates: true })
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true, candidates: rows.length })
}
