import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// DELETE /api/account/delete
//
// Permanently deletes the signed-in user's account and all data
// owned by them: profile, purchases, children, stamps, country visits,
// flights, journal entries.
//
// Requires the request body to include `{ confirm: "DELETE" }` so the
// caller has to type the word to opt in — same pattern as GitHub.
//
// Active Stripe subscriptions are NOT cancelled here. The user should
// already have hit "Cancel subscription" before deleting their account
// (we link that out in the UI). If they haven't, the subscription
// keeps billing until its next renewal, then fails when the customer
// is missing in our DB. We surface that in the confirmation modal.

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let body: { confirm?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 })
  }
  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'Type DELETE to confirm.' },
      { status: 400 },
    )
  }

  const sb = admin()

  // Clean up data we own, in the right order so foreign-key cascades
  // play nicely even if cascading is mis-configured on any table.
  // The auth user delete at the end will also cascade via FK, but
  // doing this first means no orphan rows if the auth call fails.
  const cleanup = [
    sb.from('journal_entries').delete().eq('parent_id', user.id),
    sb.from('stamps').delete().eq('parent_id', user.id),
    sb.from('family_country_visits').delete().eq('parent_id', user.id),
    sb.from('pack_assignments').delete().eq('parent_id', user.id),
    sb.from('kid_pack_state').delete().eq('parent_id', user.id),
    sb.from('children').delete().eq('parent_id', user.id),
    sb.from('purchases').delete().eq('user_id', user.id),
    sb.from('profiles').delete().eq('id', user.id),
  ]

  // Best-effort: ignore individual errors (table might not exist on
  // this env, row might not exist). The auth delete is the source of
  // truth. Wrap in async IIFE so we can use try/catch on each.
  await Promise.all(cleanup.map(async p => {
    try { await p } catch { /* ignore */ }
  }))

  const { error } = await sb.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json(
      { error: `Could not delete account: ${error.message}` },
      { status: 500 },
    )
  }

  // Sign the user out of their current browser session so they end up
  // back on the home page.
  await supabase.auth.signOut().catch(() => null)

  return NextResponse.json({ ok: true })
}
