import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, buildWelcomeEmail, HELLO_FROM } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Idempotent welcome trigger. The auth callback hits this once a
// session is established. We:
//   1. Verify the caller is authenticated (cookie session)
//   2. Read profiles.welcome_sent_at
//   3. If null, send the welcome email and stamp the timestamp
//   4. Otherwise no-op
// Returning 200 either way so the auth callback never has anything
// to recover from.

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 })
  }

  // We need to write welcome_sent_at; profiles RLS only lets the user
  // update their own row. The authenticated client already meets that
  // policy.
  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select('full_name, welcome_sent_at')
    .eq('id', user.id)
    .maybeSingle()

  if (readErr) {
    return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 })
  }
  if (profile?.welcome_sent_at) {
    return NextResponse.json({ ok: true, alreadySent: true })
  }

  // Mark first so concurrent calls don't both send. Use service role
  // so the write goes through even if RLS would otherwise block it
  // (e.g. profile created by trigger and not yet "owned" client-side).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
  }
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const now = new Date().toISOString()
  const { error: stampErr } = await admin
    .from('profiles')
    .update({ welcome_sent_at: now })
    .eq('id', user.id)
    .is('welcome_sent_at', null)
  if (stampErr) {
    return NextResponse.json({ ok: false, error: stampErr.message }, { status: 500 })
  }

  // Fire the email. If it fails, roll back the stamp so a retry can
  // try again.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  const tpl = buildWelcomeEmail({ name: profile?.full_name ?? null, siteUrl })
  const result = await sendEmail({
    from: HELLO_FROM,
    to: user.email!,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  })

  if (!result.ok) {
    await admin.from('profiles').update({ welcome_sent_at: null }).eq('id', user.id)
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: result.id })
}
