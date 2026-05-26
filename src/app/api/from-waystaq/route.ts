// Receiving end of the WayStaq -> JFT discount bridge. The mirror of the
// outbound JFT -> WayStaq mint at /api/waystaq/upgrade-link.
//
// A WayStaq Premium subscriber who clicks their "50% off JFT" perk is
// sent here with a short-lived HMAC token:
//   GET /api/from-waystaq?token=<base64url(<email>|<ts_ms>|<hex_hmac>)>
//
// We (1) verify the signature with WAYSTAQ_BRIDGE_SECRET, (2) reject
// expired / future-dated tokens, (3) independently re-check Stripe that
// the email really is a paid WayStaq Premium subscriber (so a leaked or
// shared token can't be redeemed for a different email inside the
// 15-minute window), then redirect to the £25 JFT Premium payment link
// with the email prefilled.
//
// On ANY failure we redirect to the JFT homepage. We never render an
// error page: the worst case is the visitor lands on the site and
// browses normally. Same fail-safe behaviour as the outbound direction.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FALLBACK_HOMEPAGE = 'https://jaxfamilytravels.com/'
const TOKEN_TTL_MS = 15 * 60 * 1000
const CLOCK_SKEW_MS = 60 * 1000

// WayStaq Premium price IDs (£50 current + £24.99 grandfathered). Per the
// bridge spec these live on the SAME Stripe account as JFT, so JFT's
// STRIPE_SECRET_KEY can see them. If WayStaq ever moves to its own Stripe
// account, both this list and the key used below have to change.
const WAYSTAQ_PREMIUM_PRICE_IDS = [
  'price_1TacSjBedsajl023Pzv6cYyd',
  'price_1TanozBedsajl0238lHDbrzd',
]

// Conservative email shape check. Also keeps stray quotes / whitespace
// out of the Stripe `customers/search` query below.
const EMAIL_RE = /^[^\s@"]+@[^\s@"]+\.[^\s@"]+$/

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  const secret = process.env.WAYSTAQ_BRIDGE_SECRET
  const stripeKey = process.env.STRIPE_SECRET_KEY
  // The verified £25 JFT Premium Stripe payment link. Read from env on
  // purpose, not hard-coded: the money destination should be set
  // deliberately by an operator who has confirmed the link in JFT's own
  // Stripe dashboard. If it's unset the endpoint just falls back to the
  // homepage.
  const discountLink = process.env.WAYSTAQ_DISCOUNT_PAYMENT_LINK

  if (!token || !secret || !stripeKey || !discountLink) {
    if (!secret) console.error('[from-waystaq] WAYSTAQ_BRIDGE_SECRET not set')
    if (!stripeKey) console.error('[from-waystaq] STRIPE_SECRET_KEY not set')
    if (!discountLink) console.error('[from-waystaq] WAYSTAQ_DISCOUNT_PAYMENT_LINK not set')
    return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)
  }

  // Decode the token. base64url(<email>|<ts>|<hex_hmac>).
  let email: string, ts: string, sig: string
  try {
    ;[email, ts, sig] = base64urlDecode(token).split('|')
  } catch {
    return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)
  }
  if (!email || !ts || !sig || !EMAIL_RE.test(email)) {
    return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)
  }

  // Expiry + clock-skew window.
  const tsNum = Number(ts)
  const now = Date.now()
  if (!Number.isFinite(tsNum)) return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)
  if (tsNum + TOKEN_TTL_MS < now) return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)
  if (tsNum - CLOCK_SKEW_MS > now) return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)

  // Signature, constant-time compared.
  const expected = await hmacSha256Hex(secret, `${email}|${ts}`)
  if (!constantTimeEqual(expected, sig)) {
    return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)
  }

  // Defence in depth: a valid signature alone isn't enough. Re-check
  // Stripe that this email is actually a paid WayStaq Premium subscriber.
  let eligible = false
  try {
    eligible = await isPaidWayStaqSubscriber(stripeKey, email)
  } catch (e) {
    console.error('[from-waystaq] Stripe re-check failed', e)
    return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)
  }
  if (!eligible) return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)

  // All checks passed. Send them to the £25 link with email prefilled.
  const dest = new URL(discountLink)
  dest.searchParams.set('prefilled_email', email)
  return NextResponse.redirect(dest.toString(), 302)
}

async function isPaidWayStaqSubscriber(stripeKey: string, email: string): Promise<boolean> {
  const headers = { Authorization: `Bearer ${stripeKey}` }
  const query = `email:"${email.toLowerCase()}"`
  const lookup = await fetch(
    `https://api.stripe.com/v1/customers/search?query=${encodeURIComponent(query)}`,
    { headers },
  )
  if (!lookup.ok) return false
  const { data: customers = [] } = await lookup.json()

  for (const customer of customers) {
    const subsRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=100`,
      { headers },
    )
    if (!subsRes.ok) continue
    const { data: subs = [] } = await subsRes.json()
    for (const sub of subs) {
      for (const item of sub.items?.data ?? []) {
        if (item.price && WAYSTAQ_PREMIUM_PRICE_IDS.includes(item.price.id)) return true
      }
    }
  }
  return false
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Symmetric with the byte-safe base64url encoder in
// /api/waystaq/upgrade-link, so tokens minted by either side decode the
// same way even if an email ever carries non-ASCII bytes.
function base64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
