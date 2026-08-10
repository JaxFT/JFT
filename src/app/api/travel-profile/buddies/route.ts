// POST link a real JFT account as a travel buddy (by user id, found
// via the search endpoint). DELETE remove one by id.
//
// Buddies are only selectable from within the site, no freeform
// names — see travel-profiles-v3.sql.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BUDDIES = 40

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}

  const buddyUserId = typeof body.buddy_user_id === 'string' ? body.buddy_user_id : ''
  if (!buddyUserId) return NextResponse.json({ error: 'buddy_user_id required' }, { status: 400 })
  if (buddyUserId === user.id) {
    return NextResponse.json({ error: "You can't add yourself as a travel buddy" }, { status: 400 })
  }

  const { count } = await supabase
    .from('travel_profile_buddies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= MAX_BUDDIES) {
    return NextResponse.json({ error: `Travel buddies is capped at ${MAX_BUDDIES}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('travel_profile_buddies')
    .insert({ user_id: user.id, buddy_user_id: buddyUserId })
    .select('id')
    .single()
  if (error) {
    // Unique violation on (user_id, buddy_user_id) — already added.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already added as a travel buddy' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profiles = await getPublicProfilesByIds([buddyUserId])
  const p = profiles.get(buddyUserId)

  return NextResponse.json({
    ok: true,
    buddy: { id: data.id, buddy_user_id: buddyUserId, username: p?.username ?? null, full_name: p?.full_name ?? null },
  })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('travel_profile_buddies')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
