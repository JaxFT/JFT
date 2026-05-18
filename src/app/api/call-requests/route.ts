import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import {
  sendEmail, buildCallRequestNotificationEmail, buildCallRequestConfirmationEmail,
  BEC_FROM, HELLO_FROM, ADMIN_NOTIFY,
} from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CallRequestBody = {
  name?: string
  email?: string
  family_situation?: string
  where_now?: string
  journey_stage?: string
  what_to_discuss?: string
  timezone?: string
}

const VALID_JOURNEY_STAGES = ['dreaming', 'planning', 'soon', 'already']

export async function POST(request: Request) {
  let body: CallRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim()
  const whatToDiscuss = (body.what_to_discuss ?? '').trim()

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (!whatToDiscuss) {
    return NextResponse.json({ error: 'Please tell us what you\'d like to discuss' }, { status: 400 })
  }

  const journeyStage = body.journey_stage && VALID_JOURNEY_STAGES.includes(body.journey_stage)
    ? body.journey_stage
    : null

  // Insert via service role — RLS denies anon writes by default
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }
  const supabase = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const familySituation = (body.family_situation ?? '').trim() || null
  const whereNow = (body.where_now ?? '').trim() || null
  const timezone = (body.timezone ?? '').trim() || null

  const { error } = await supabase.from('call_requests').insert({
    name,
    email,
    family_situation: familySituation,
    where_now: whereNow,
    journey_stage: journeyStage,
    what_to_discuss: whatToDiscuss,
    timezone,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fire-and-forget both emails — don't block the response or fail
  // the form if Resend has an off day. Logged for debugging via the
  // return value of sendEmail but not surfaced to the user.
  const payload = {
    name, email,
    familySituation, whereNow,
    journeyStage,
    whatToDiscuss,
    timezone,
  }
  const notif = buildCallRequestNotificationEmail(payload)
  const confirm = buildCallRequestConfirmationEmail({ name, whatToDiscuss })
  await Promise.all([
    sendEmail({
      from: HELLO_FROM,
      to: ADMIN_NOTIFY,
      subject: notif.subject,
      html: notif.html,
      text: notif.text,
      replyTo: email,
    }),
    sendEmail({
      from: BEC_FROM,
      to: email,
      subject: confirm.subject,
      html: confirm.html,
      text: confirm.text,
      replyTo: ADMIN_NOTIFY,
    }),
  ])

  return NextResponse.json({ ok: true })
}
