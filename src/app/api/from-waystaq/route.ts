// Receiving end of the WayStaq -> JFT discount bridge. The mirror of the
// outbound JFT -> WayStaq mint at /api/waystaq/upgrade-link.
//
// A WayStaq Premium subscriber who clicks their "50% off JFT" perk is
// sent here with a short-lived HMAC token:
//   GET /api/from-waystaq?token=<base64url(<email>|<ts_ms>|<hex_hmac>)>
//
// We (1) verify the signature with WAYSTAQ_BRIDGE_SECRET, (2) reject
// expired / future-dated tokens, (3) independently re-check Stripe that
// the email really is a paid WayStaq Premium subscriber. If all of that
// passes we drop a short-lived signed discount cookie and land them on the
// JFT homepage to browse. The £25 price is then applied at the Premium
// checkout (and shown in a banner) for as long as the cookie is valid,
// see src/lib/waystaq-discount.ts.
//
// On ANY failure we redirect to the JFT homepage with no cookie. We never
// render an error page: the worst case is the visitor browses normally at
// the standard price.

import { NextResponse } from 'next/server'
import {
  WAYSTAQ_DISCOUNT_COOKIE,
  WAYSTAQ_DISCOUNT_WINDOW_MS,
  signDiscountCookie,
  hmacSha256Hex,
  constantTimeEqual,
  base64urlDecode,
} from '@/lib/waystaq-discount'

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

// Conservative email shape check. Also keeps stray quotes / whitespace out
// of the Stripe `customers/search` query below.
const EMAIL_RE = /^[^\s@"]+@[^\s@"]+\.[^\s@"]+$/

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  const secret = process.env.WAYSTAQ_BRIDGE_SECRET
  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!token || !secret || !stripeKey) {
    if (!secret) console.error('[from-waystaq] WAYSTAQ_BRIDGE_SECRET not set')
    if (!stripeKey) console.error('[from-waystaq] STRIPE_SECRET_KEY not set')
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
  //
  // Exception: WAYSTAQ_BRIDGE_BYPASS_EMAILS is a small allowlist of admin /
  // comped accounts that WayStaq treats as premium WITHOUT a real Stripe
  // subscription (WayStaq skips its own Stripe check for these too). Their
  // token is still HMAC-verified above, so only WayStaq can mint one, but
  // there's no Stripe sub for the re-check to find. Keep this list tiny and
  // limited to accounts you control.
  const bypassEmails = (process.env.WAYSTAQ_BRIDGE_BYPASS_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

  let eligible = false
  if (bypassEmails.includes(email.toLowerCase())) {
    eligible = true
  } else {
    try {
      eligible = await isPaidWayStaqSubscriber(stripeKey, email)
    } catch (e) {
      console.error('[from-waystaq] Stripe re-check failed', e)
      return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)
    }
  }
  if (!eligible) return NextResponse.redirect(FALLBACK_HOMEPAGE, 302)

  // Verified. Drop a signed, short-lived discount cookie and send them to
  // the site to browse. The cookie carries the email + its own expiry,
  // both signed, so it can't be forged or extended.
  const expiresAt = now + WAYSTAQ_DISCOUNT_WINDOW_MS
  const cookieValue = await signDiscountCookie(email, expiresAt, secret)
  const res = NextResponse.redirect(FALLBACK_HOMEPAGE, 302)
  res.cookies.set(WAYSTAQ_DISCOUNT_COOKIE, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(WAYSTAQ_DISCOUNT_WINDOW_MS / 1000),
  })
  return res
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
