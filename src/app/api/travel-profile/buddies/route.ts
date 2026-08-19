// POST link a real JFT account as a travel buddy (by user id, found
// via the search endpoint) — reciprocal, adding someone creates the
// relationship on both sides in one action, no accept step. DELETE
// removes a buddy, also reciprocal ("unfriending" ends it for both).
//
// Buddies are only selectable from within the site, no freeform
// names — see travel-profiles-v3.sql.

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { createNotification } from '@/lib/notifications'
import { shortName } from '@/lib/display-name'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BUDDIES = 40

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

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

  // Both directions in one upsert — the mirror row (buddy_user_id's
  // side) needs the service role since RLS only lets a normal client
  // insert rows where user_id = themselves. ignoreDuplicates + the
  // returning select is how we tell which side(s) were genuinely new
  // vs already existed (ON CONFLICT DO NOTHING RETURNING only returns
  // rows actually inserted).
  const admin = adminClient()
  const { data: insertedRows, error } = await admin
    .from('travel_profile_buddies')
    .upsert(
      [
        { user_id: user.id, buddy_user_id: buddyUserId },
        { user_id: buddyUserId, buddy_user_id: user.id },
      ],
      { onConflict: 'user_id,buddy_user_id', ignoreDuplicates: true },
    )
    .select('id, user_id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const myNewRow = (insertedRows ?? []).find(r => r.user_id === user.id)
  if (!myNewRow) {
    return NextResponse.json({ error: 'Already added as a travel buddy' }, { status: 400 })
  }

  // Only notify if the other side was also newly created — if they
  // already had you (a legacy one-directional row from before this
  // was reciprocal), this call just healed that silently, no need to
  // tell them again.
  const theirSideIsNew = (insertedRows ?? []).some(r => r.user_id === buddyUserId)
  if (theirSideIsNew) {
    const { data: actorProfile } = await supabase.from('profiles').select('username, full_name').eq('id', user.id).maybeSingle()
    const name = shortName(actorProfile?.full_name) || 'Someone'
    await createNotification({
      userId: buddyUserId,
      actorUserId: user.id,
      type: 'buddy_added',
      message: `${name} added you as a travel buddy`,
      link: actorProfile?.username ? `/u/${actorProfile.username}` : '/travel-profile',
    })
  }

  const profiles = await getPublicProfilesByIds([buddyUserId])
  const p = profiles.get(buddyUserId)

  return NextResponse.json({
    ok: true,
    buddy: { id: myNewRow.id, buddy_user_id: buddyUserId, username: p?.username ?? null, full_name: p?.full_name ?? null },
  })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: row } = await supabase
    .from('travel_profile_buddies')
    .select('buddy_user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('travel_profile_buddies')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mirror removal on their side — needs the service role, it's not
  // this caller's row. Best-effort: the caller's own removal above is
  // what matters most and has already succeeded either way.
  await adminClient()
    .from('travel_profile_buddies')
    .delete()
    .eq('user_id', row.buddy_user_id)
    .eq('buddy_user_id', user.id)

  return NextResponse.json({ ok: true })
}
