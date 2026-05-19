import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PermissionMode } from '@/lib/passport-types'
import { isValidCountryIso2 } from '@/lib/countries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PERMISSION_MODES: PermissionMode[] = ['view', 'guided', 'creator']

// PATCH /api/family/children/[id]
// Update a child the signed-in parent owns. RLS prevents touching
// rows that aren't theirs; the body is sanitised before write.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  }

  let body: {
    name?: string
    avatar?: string
    permission_mode?: string
    stamp_auto_approve?: boolean
    home_country_iso2?: string | null
  } = {}
  try { body = await request.json() } catch {}

  const update: Record<string, unknown> = {}

  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name || name.length > 60) {
      return NextResponse.json({ error: 'Name must be 1–60 characters.' }, { status: 400 })
    }
    update.name = name
  }
  if (typeof body.avatar === 'string' && body.avatar.length > 0 && body.avatar.length <= 16) {
    update.avatar = body.avatar
  }
  if (typeof body.permission_mode === 'string' && (PERMISSION_MODES as string[]).includes(body.permission_mode)) {
    update.permission_mode = body.permission_mode
  }
  if (typeof body.stamp_auto_approve === 'boolean') {
    update.stamp_auto_approve = body.stamp_auto_approve
  }
  if (body.home_country_iso2 === null || body.home_country_iso2 === '') {
    update.home_country_iso2 = null
  } else if (typeof body.home_country_iso2 === 'string') {
    if (!isValidCountryIso2(body.home_country_iso2)) {
      return NextResponse.json({ error: 'Unknown home country.' }, { status: 400 })
    }
    update.home_country_iso2 = body.home_country_iso2.toLowerCase()
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('children')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/family/children/[id]
// Hard-delete. CASCADE in the schema tears down assignments, packs,
// stamps, journal entries, and country visits in one go.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  }

  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
