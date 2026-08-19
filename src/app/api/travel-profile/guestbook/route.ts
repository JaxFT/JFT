// GET list guestbook entries for a profile (?user=<id>, optional
// &before=<ISO timestamp> for "load more" pagination), with author
// names resolved. POST add an entry. DELETE (?id=) removes it, if
// the caller wrote it, owns the page, or is an admin.

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { isAdminEmail } from '@/lib/admin'
import { createNotification } from '@/lib/notifications'
import { shortName } from '@/lib/display-name'
import { containsBlockedWord } from '@/lib/profanity-filter'
import { logModerationItem } from '@/lib/moderation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAGE_SIZE = 20
const MAX_LENGTH = 500

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const profileUserId = searchParams.get('user')
  const before = searchParams.get('before')
  if (!profileUserId) return NextResponse.json({ error: 'Missing user' }, { status: 400 })

  let query = supabase
    .from('travel_profile_guestbook')
    .select('id, profile_user_id, author_user_id, body, created_at')
    .eq('profile_user_id', profileUserId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)
  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const authors = await getPublicProfilesByIds([...new Set(rows.map(r => r.author_user_id))])
  const entries = rows.map(r => ({ ...r, author: authors.get(r.author_user_id) ?? null }))

  return NextResponse.json({ ok: true, entries, hasMore: rows.length === PAGE_SIZE })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}
  const profileUserId = typeof body.profile_user_id === 'string' ? body.profile_user_id : ''
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!profileUserId) return NextResponse.json({ error: 'Missing profile_user_id' }, { status: 400 })
  if (!text) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Messages are capped at ${MAX_LENGTH} characters` }, { status: 400 })
  }
  if (containsBlockedWord(text)) {
    return NextResponse.json({ error: "That message can't be posted as written." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('travel_profile_guestbook')
    .insert({ profile_user_id: profileUserId, author_user_id: user.id, body: text })
    .select('id, profile_user_id, author_user_id, body, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await supabase.from('profiles').select('username, full_name').eq('id', user.id).maybeSingle()

  const ownerProfiles = await getPublicProfilesByIds([profileUserId])
  const owner = ownerProfiles.get(profileUserId)
  const name = shortName(profile?.full_name) || 'Someone'
  const link = owner?.username ? `/u/${owner.username}` : '/travel-profile'
  await createNotification({
    userId: profileUserId,
    actorUserId: user.id,
    type: 'guestbook_comment',
    message: `${name} left a message in your guestbook`,
    link,
  })
  await logModerationItem({
    contentType: 'guestbook_entry',
    contentId: data.id,
    authorUserId: user.id,
    bodySnapshot: text,
    contextLabel: `Guestbook message to ${owner?.username ?? owner?.full_name ?? 'a member'}`,
    contextLink: link,
  })

  return NextResponse.json({
    ok: true,
    entry: { ...data, author: { id: user.id, username: profile?.username ?? null, full_name: profile?.full_name ?? null } },
  })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  if (isAdminEmail(user.email)) {
    const { error } = await adminClient().from('travel_profile_guestbook').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // RLS covers the author-or-owner check, a delete that matches
  // neither just affects 0 rows rather than erroring.
  const { error } = await supabase.from('travel_profile_guestbook').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
