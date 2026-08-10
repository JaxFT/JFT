// POST add a named travel buddy. DELETE remove one by id.
// Phase 1: freeform names only, no account linkage, no trip
// association — see travel-profiles.sql for the reasoning.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BUDDIES = 40

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : ''
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { count } = await supabase
    .from('travel_profile_buddies')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= MAX_BUDDIES) {
    return NextResponse.json({ error: `Travel buddies is capped at ${MAX_BUDDIES}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('travel_profile_buddies')
    .insert({ user_id: user.id, name })
    .select('id, name')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, buddy: data })
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
