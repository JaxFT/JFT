import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'

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

  const { error } = await supabase.from('call_requests').insert({
    name,
    email,
    family_situation: (body.family_situation ?? '').trim() || null,
    where_now: (body.where_now ?? '').trim() || null,
    journey_stage: journeyStage,
    what_to_discuss: whatToDiscuss,
    timezone: (body.timezone ?? '').trim() || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
