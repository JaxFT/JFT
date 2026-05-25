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

  // Cascade chain does the cleanup:
  //   auth.users ── ON DELETE CASCADE ──▶ profiles
  //   profiles   ── ON DELETE CASCADE ──▶ children
  //   children   ── ON DELETE CASCADE ──▶ stamps, kid_adventure_pack_*,
  //                                       child_pack_assignments,
  //                                       journal_entries
  //   profiles   ── ON DELETE CASCADE ──▶ family_country_visits,
  //                                       purchases, jax_pack_purchases,
  //                                       web_guide_purchases
  // So a single deleteUser call wipes every row this user owns. If
  // the auth delete fails we leave everything intact rather than
  // half-delete, which is the right behaviour.
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
