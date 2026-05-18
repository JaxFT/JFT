import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// One-click unsubscribe. Called via GET from the link embedded in
// every marketing email's footer. No login required (UK PECR + good
// UX). The token in `?t=` is HMAC-signed against the user's id, so we
// can trust which account to update without asking.
//
// On success: marketing_opt_in is set to false. Account, premium
// subscription, and any other state are NOT touched — this strictly
// affects marketing emails.
//
// Responds with JSON so the /unsubscribe page can render a result.
// (We also support direct browser navigation here returning the JSON
// — the friendly UI is at /unsubscribe.)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('t') ?? ''
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
  }
  const verified = await verifyUnsubscribeToken(token)
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: verified.error }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
  }
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { error } = await admin
    .from('profiles')
    .update({ marketing_opt_in: false })
    .eq('id', verified.uid)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
