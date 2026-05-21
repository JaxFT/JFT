import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
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
  preferred_days?: unknown
  preferred_times?: unknown
}

const VALID_JOURNEY_STAGES = ['dreaming', 'planning', 'soon', 'already']
const VALID_DAYS  = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const VALID_TIMES = ['morning', 'afternoon', 'evening']

function cleanStringList(input: unknown, allowed: string[]): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of input) {
    if (typeof v !== 'string') continue
    const lower = v.trim().toLowerCase()
    if (!allowed.includes(lower) || seen.has(lower)) continue
    seen.add(lower)
    out.push(lower)
  }
  return out
}

export async function POST(request: Request) {
  // Sign-in is required, the requester gets a thread in /account so we
  // need a user_id to scope it to. Anon submissions go away entirely.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to book a 1:1 call.' }, { status: 401 })
  }

  let body: CallRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim() || user.email || ''
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

  const preferredDays  = cleanStringList(body.preferred_days, VALID_DAYS)
  const preferredTimes = cleanStringList(body.preferred_times, VALID_TIMES)

  // Insert via service role so we can attach user_id and bypass the
  // default-deny RLS without granting an insert policy that anyone
  // signed in could exploit on someone else's behalf.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const familySituation = (body.family_situation ?? '').trim() || null
  const whereNow = (body.where_now ?? '').trim() || null
  const timezone = (body.timezone ?? '').trim() || null

  const { data: inserted, error } = await admin
    .from('call_requests')
    .insert({
      user_id: user.id,
      name,
      email,
      family_situation: familySituation,
      where_now: whereNow,
      journey_stage: journeyStage,
      what_to_discuss: whatToDiscuss,
      timezone,
      preferred_days: preferredDays,
      preferred_times: preferredTimes,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fire-and-forget both emails, don't block the response or fail
  // the form if Resend has an off day.
  const payload = {
    name, email,
    familySituation, whereNow,
    journeyStage,
    whatToDiscuss,
    timezone,
    preferredDays, preferredTimes,
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

  return NextResponse.json({ ok: true, id: inserted?.id ?? null })
}
