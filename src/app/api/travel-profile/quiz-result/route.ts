// POST { type } — save the signed-in user's "What Kind of Traveller
// Are You?" result to their Travel Profile. Silently requires auth;
// the quiz itself stays fully anonymous/no-signup, this just persists
// the result for whoever happens to be logged in when they finish it.
// Upserts travel_profiles so this works even if the user has never
// touched their Travel Profile before (is_public defaults false).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_TYPES = new Set(['planner', 'wanderer', 'settler', 'adventurer', 'hacker', 'comfort'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}

  const type = typeof body.type === 'string' ? body.type : ''
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid traveller type' }, { status: 400 })
  }

  const { error } = await supabase
    .from('travel_profiles')
    .upsert(
      { user_id: user.id, traveller_type: type, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
