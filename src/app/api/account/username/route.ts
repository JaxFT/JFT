// POST /api/account/username
// Sets or updates the signed-in user's username + optional Instagram
// handle. Validates server-side and returns the saved values (or a
// 409 if the username is already taken).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  normaliseUsername, validateUsername,
  normaliseInstagram, validateInstagram,
} from '@/lib/usernames'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: { username?: string; instagram_handle?: string } = {}
  try { body = await request.json() } catch {}

  const rawUsername = typeof body.username === 'string' ? body.username : ''
  const rawInsta    = typeof body.instagram_handle === 'string' ? body.instagram_handle : ''
  const isAdmin = isAdminEmail(user.email)

  const usernameCheck = validateUsername(rawUsername, { bypassReserved: isAdmin })
  if (!usernameCheck.ok) return NextResponse.json({ error: usernameCheck.error }, { status: 400 })
  const instaCheck = validateInstagram(rawInsta)
  if (!instaCheck.ok) return NextResponse.json({ error: instaCheck.error }, { status: 400 })

  const username = normaliseUsername(rawUsername)
  // Non-admins can't set or change an Instagram handle from this
  // endpoint, the field is hidden in their account UI. We still let
  // it through for admins (Bec + Oli, who share jax.familytravels).
  const instagram_handle = isAdmin ? (normaliseInstagram(rawInsta) || null) : undefined

  const update: Record<string, unknown> = { username }
  if (instagram_handle !== undefined) update.instagram_handle = instagram_handle

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) {
    // Postgres unique_violation when the username is taken.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'That username is taken — try another.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, username, instagram_handle: instagram_handle ?? null })
}
