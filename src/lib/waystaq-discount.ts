// Shared helpers for the WayStaq -> JFT discount, the bit that lives
// AFTER the bridge handshake. When /api/from-waystaq verifies a visitor,
// it drops a short-lived signed cookie here. The Premium checkout and the
// site-wide banner read that cookie to offer the £25 price for the window.
//
// Cookie value: base64url(<email>|<expiryMs>|<hex_hmac>), where
// hmac = HMAC-SHA256(WAYSTAQ_BRIDGE_SECRET, "<email>|<expiryMs>"). The
// signature stops anyone from minting their own discount cookie; the
// expiry is baked into the signed payload so it can't be extended either.

import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { isPremiumTier } from '@/lib/profile'
import { createClient as createServerSupabase } from '@/lib/supabase/server'

export const WAYSTAQ_DISCOUNT_COOKIE = 'jft_ws_discount'
// How long the £25 price stays available after arriving from WayStaq.
export const WAYSTAQ_DISCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h

export async function signDiscountCookie(
  email: string,
  expiryMs: number,
  secret: string,
): Promise<string> {
  const message = `${email}|${expiryMs}`
  const sig = await hmacSha256Hex(secret, message)
  return base64url(`${message}|${sig}`)
}

export async function verifyDiscountCookie(
  value: string,
  secret: string,
): Promise<{ email: string; expiresAt: number } | null> {
  try {
    const [email, expStr, sig] = base64urlDecode(value).split('|')
    if (!email || !expStr || !sig) return null
    const expiryMs = Number(expStr)
    if (!Number.isFinite(expiryMs) || expiryMs < Date.now()) return null
    const expected = await hmacSha256Hex(secret, `${email}|${expStr}`)
    if (!constantTimeEqual(expected, sig)) return null
    return { email, expiresAt: expiryMs }
  } catch {
    return null
  }
}

// Server-side reader for route handlers and server components. Returns the
// active discount (with the email it was issued for) or null.
export async function readWaystaqDiscount(): Promise<{ email: string; expiresAt: number } | null> {
  const secret = process.env.WAYSTAQ_BRIDGE_SECRET
  if (!secret) return null
  const value = (await cookies()).get(WAYSTAQ_DISCOUNT_COOKIE)?.value
  if (!value) return null
  return verifyDiscountCookie(value, secret)
}

// Should we currently advertise the £25 WayStaq price to this viewer?
//
// Active when there's a valid discount cookie AND either:
//   - they're logged out (signup pre-fills the matching email), or
//   - they're logged in, their account email matches the cookie, they
//     aren't an admin, and they don't already have Premium.
//
// Used by the bottom banner and the various premium-price displays
// around the site so the gating logic stays in one place.
export async function getWaystaqDiscountState(): Promise<{ active: boolean }> {
  const discount = await readWaystaqDiscount()
  if (!discount) return { active: false }
  const user = await getCurrentUser()
  if (!user) return { active: true }
  if (user.email?.toLowerCase() !== discount.email.toLowerCase()) return { active: false }
  if (isAdminEmail(user.email)) return { active: false }
  const supabase = await createServerSupabase()
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()
  if (isPremiumTier(profile?.subscription_tier)) return { active: false }
  return { active: true }
}

// ── crypto / encoding helpers (shared with /api/from-waystaq) ──────────

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function base64url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
