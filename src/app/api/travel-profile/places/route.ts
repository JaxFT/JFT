// POST add a country to the "been" or "want" list. DELETE remove one
// by id. PATCH toggle a "been" row's Top 8 rank.
//
// Uses the cookie-based client throughout (not service role) — RLS on
// travel_profile_places already scopes every write to the caller's
// own rows, no need to bypass it.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCountryByIso2 } from '@/lib/countries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_PER_LIST = 100 // sanity cap, not a real product limit

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}

  const iso2 = typeof body.iso2 === 'string' ? body.iso2.toLowerCase() : ''
  const listType = body.list_type === 'want' ? 'want' : body.list_type === 'been' ? 'been' : null
  if (!listType || !getCountryByIso2(iso2)) {
    return NextResponse.json({ error: 'Valid country and list_type required' }, { status: 400 })
  }

  const { count } = await supabase
    .from('travel_profile_places')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('list_type', listType)
  if ((count ?? 0) >= MAX_PER_LIST) {
    return NextResponse.json({ error: `That list is capped at ${MAX_PER_LIST} countries` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('travel_profile_places')
    .upsert(
      { user_id: user.id, iso2, list_type: listType },
      { onConflict: 'user_id,iso2,list_type' },
    )
    .select('id, iso2, list_type, top8_rank')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, place: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('travel_profile_places')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// Toggle a "been" row's Top 8 slot. Passing rank: null clears it.
// The unique partial index on (user_id, top8_rank) means setting a
// rank that's already taken by another country needs that row
// cleared first, done here in one request so the UI can just say
// "make this #3" without a two-step dance.
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}

  const id = typeof body.id === 'string' ? body.id : ''
  const rank = body.rank === null ? null : Number(body.rank)
  if (!id || (rank !== null && (!Number.isInteger(rank) || rank < 1 || rank > 3))) {
    return NextResponse.json({ error: 'id and rank (1-3 or null) required' }, { status: 400 })
  }

  if (rank !== null) {
    // Bump whichever row currently holds this rank out of the way.
    await supabase
      .from('travel_profile_places')
      .update({ top8_rank: null })
      .eq('user_id', user.id)
      .eq('top8_rank', rank)
      .neq('id', id)
  }

  const { error } = await supabase
    .from('travel_profile_places')
    .update({ top8_rank: rank })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
