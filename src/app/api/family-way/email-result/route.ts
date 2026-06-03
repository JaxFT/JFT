// Sends a visitor's Family Way calculator result to the email they
// provided. Transactional, fired by their explicit click of "Email me my
// result" on /i-want-to-travel, so it goes regardless of marketing
// opt-in. Open endpoint; the modal handles signup separately client-side
// using Supabase, then calls here to deliver the result email itself.
//
// Payload is normalised + clamped so a tampered request can't bloat the
// email body or inject HTML; escaping happens in the template.

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { sendEmail, HELLO_FROM, buildFamilyWayResultEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@"]+@[^\s@"]+\.[^\s@"]+$/

// IP rate limit: at most this many sends per hour from the same client.
// Generous enough that a legitimate visitor can resend if they made a
// typo, tight enough that nobody can use this as a free email blaster.
const RATE_LIMIT_PER_HOUR = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

// Service-role client for the rate-limit table. RLS denies everything
// to anon/authenticated; only this route reads/writes it.
function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? '0.0.0.0'
  )
}

// We don't store raw IPs. The prefix is a soft application-specific salt
// so a leaked hash dump can't be reversed via a generic IPv4 rainbow
// table; the table is service-role-only via RLS anyway.
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`fwer:${ip}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const b = body as Record<string, unknown>

  const email = typeof b.email === 'string' ? b.email.trim() : ''
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  const result = normaliseResult(b.result)
  if (!result) {
    return NextResponse.json({ error: 'Result missing or invalid' }, { status: 400 })
  }

  // IP-keyed rate limit. Check the window first; on success record the
  // attempt before sending so concurrent bursts can't slip through. If
  // Supabase is unreachable we let the send through rather than block a
  // legitimate visitor on a transient failure (the abuse window is hours,
  // not seconds, so the occasional bypass is acceptable).
  const ipHash = await hashIp(getClientIp(request))
  try {
    const sb = admin()
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const { count, error: countErr } = await sb
      .from('family_way_email_rate_limit')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('sent_at', since)
    if (!countErr && (count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many requests, please try again in an hour.' },
        { status: 429 },
      )
    }
    // Reserve a slot before sending, so two parallel requests both count.
    if (!countErr) {
      await sb.from('family_way_email_rate_limit').insert({ ip_hash: ipHash })
    }
  } catch (e) {
    console.error('[family-way/email-result] rate-limit check failed', e)
    // Fall through and still send.
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  const safeName = typeof b.name === 'string' && b.name.length > 0 && b.name.length < 80
    ? b.name
    : null

  const { subject, html, text } = buildFamilyWayResultEmail({
    name: safeName,
    siteUrl,
    score: result.score,
    band: result.band,
    tagline: result.tagline,
    style: result.style,
    familyDesc: result.familyDesc,
    paceText: result.paceText,
    strengths: result.strengths,
    challenges: result.challenges,
    actions: result.actions,
    nextStep: result.nextStep,
  })

  const r = await sendEmail({ from: HELLO_FROM, to: email, subject, html, text })
  if (!r.ok) {
    console.error('[family-way/email-result] send failed', r.error)
    return NextResponse.json({ error: r.error ?? 'Send failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

type Result = {
  score: number
  band: string
  tagline: string
  style: string
  familyDesc: string
  paceText: string
  strengths: string[]
  challenges: string[]
  actions: string[]
  nextStep: { title: string; body: string }
}

function normaliseResult(r: unknown): Result | null {
  if (!r || typeof r !== 'object') return null
  const o = r as Record<string, unknown>
  if (typeof o.score !== 'number' || !Number.isFinite(o.score)) return null
  const cap = (s: unknown, max: number) => typeof s === 'string' ? s.slice(0, max) : ''
  const arr = (a: unknown, maxItems: number, maxEach: number) =>
    Array.isArray(a)
      ? a.slice(0, maxItems).map(s => cap(s, maxEach)).filter((s): s is string => s.length > 0)
      : []
  const ns = (o.nextStep && typeof o.nextStep === 'object') ? o.nextStep as Record<string, unknown> : {}
  return {
    score: Math.max(0, Math.min(100, Math.round(o.score))),
    band: cap(o.band, 60),
    tagline: cap(o.tagline, 200),
    style: cap(o.style, 60),
    familyDesc: cap(o.familyDesc, 200),
    paceText: cap(o.paceText, 200),
    strengths: arr(o.strengths, 20, 300),
    challenges: arr(o.challenges, 20, 300),
    actions: arr(o.actions, 20, 300),
    nextStep: { title: cap(ns.title, 200), body: cap(ns.body, 2000) },
  }
}
