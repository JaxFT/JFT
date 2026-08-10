// Standalone newsletter signup, no account required. Open endpoint hit
// from the NewsletterSignup box (blog post end / footer). Upserts into
// newsletter_subscribers and sends a short confirmation email with a
// one-click unsubscribe link.
//
// Rate-limited the same way as /api/family-way/email-result, this is
// also an open endpoint that triggers an outbound send.

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { sendEmail, HELLO_FROM, buildNewsletterConfirmEmail } from '@/lib/email'
import { buildUnsubscribeUrl } from '@/lib/unsubscribe-token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@"]+@[^\s@"]+\.[^\s@"]+$/

const RATE_LIMIT_PER_HOUR = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

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

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`nsub:${ip}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

const VALID_SOURCES = new Set(['blog_end', 'footer', 'quiz_result'])

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

  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  const source = typeof b.source === 'string' && VALID_SOURCES.has(b.source) ? b.source : 'unknown'

  const ipHash = await hashIp(getClientIp(request))
  const sb = admin()

  try {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const { count, error: countErr } = await sb
      .from('newsletter_subscribe_rate_limit')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('sent_at', since)
    if (!countErr && (count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many requests, please try again in an hour.' },
        { status: 429 },
      )
    }
    if (!countErr) {
      await sb.from('newsletter_subscribe_rate_limit').insert({ ip_hash: ipHash })
    }
  } catch (e) {
    console.error('[newsletter/subscribe] rate-limit check failed', e)
    // Fall through, same reasoning as family-way/email-result: the abuse
    // window is hours, not seconds, an occasional bypass is acceptable.
  }

  // Upsert on email. A prior unsubscribe is cleared, re-subscribing with
  // the same address is meant to work.
  const { data: row, error: upsertErr } = await sb
    .from('newsletter_subscribers')
    .upsert({ email, source, unsubscribed_at: null }, { onConflict: 'email' })
    .select('id')
    .single()

  if (upsertErr || !row) {
    console.error('[newsletter/subscribe] upsert failed', upsertErr)
    return NextResponse.json({ error: 'Could not subscribe right now.' }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  const unsubscribeUrl = await buildUnsubscribeUrl('subscriber', row.id as string)
  if (unsubscribeUrl) {
    const { subject, html, text } = buildNewsletterConfirmEmail({ siteUrl, unsubscribeUrl })
    const r = await sendEmail({ from: HELLO_FROM, to: email, subject, html, text, unsubscribeUrl })
    if (!r.ok) {
      // The subscription itself succeeded, don't fail the request over
      // a confirmation email that didn't send.
      console.error('[newsletter/subscribe] confirm email failed', r.error)
    }
  }

  return NextResponse.json({ ok: true })
}
