import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPackMeta } from '@/lib/adventurePackMeta'
import { autoAssignPackForVisit } from '@/lib/passport-stamps-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/family/packs
// Body: { country_slug: string }
// Assigns the named Adventure Pack to every child in the family
// who doesn't already have it. Returns silently when no children
// or when every child already has it. Used by the pack pre-
// allocation card on /account.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: { country_slug?: string } = {}
  try { body = await request.json() } catch {}
  const slug = typeof body.country_slug === 'string' ? body.country_slug : ''
  const pack = getPackMeta(slug)
  if (!pack) return NextResponse.json({ error: 'Unknown country pack.' }, { status: 400 })

  await autoAssignPackForVisit(user.id, pack.iso2)
  return NextResponse.json({ ok: true })
}
