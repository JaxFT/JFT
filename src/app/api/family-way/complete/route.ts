// Records one anonymous completion of the /i-want-to-travel Family Way
// calculator. Called by FamilyWayCompletionTracker (parent of the iframe)
// when the iframe postMessages that the results screen was reached.
//
// Open to any visitor (no auth required); the row carries user_id only
// when the visitor happens to be logged in. Service role writes the row
// so RLS on family_way_completions doesn't block anonymous callers.

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function POST(request: Request) {
  // Parse score, optional. Clamp to 0-100 so a tampered payload can't
  // store nonsense numbers.
  let score: number | null = null
  try {
    const body = await request.json() as { score?: unknown }
    if (typeof body?.score === 'number' && Number.isFinite(body.score)) {
      score = Math.max(0, Math.min(100, Math.round(body.score)))
    }
  } catch {}

  // Best-effort: record the user id if they happen to be signed in. Most
  // visitors at this point are logged out. Admins are excluded from the
  // count so our own testing doesn't skew the number, mirroring how
  // LiveHeartbeat self-excludes admin browsers from visitor counts.
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && isAdminEmail(user.email)) {
      return NextResponse.json({ ok: true, skipped: 'admin' })
    }
    userId = user?.id ?? null
  } catch {}

  try {
    await admin().from('family_way_completions').insert({ score, user_id: userId })
  } catch (e) {
    console.error('[family-way/complete] insert failed', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
