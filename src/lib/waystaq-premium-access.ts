// Server-to-server notifier for WayStaq's /api/jft-premium-access.
//
// Real paying JFT Premium subscribers get Asia Adventure viewer access
// automatically off WayStaq's own Stripe webhook. Gifted Premium bypasses
// Stripe entirely (see supabase/premium-gifts.sql), so no webhook event
// ever fires for it — this is the one path that tells WayStaq about a
// gift grant or an early admin revoke. Reuses the same WAYSTAQ_BRIDGE_SECRET
// as the discount bridge (src/lib/waystaq-discount.ts), signing a
// different message so it can't be replayed against that bridge or vice versa.
//
// Best-effort: a WayStaq outage shouldn't block the admin gift action
// itself, so failures are logged, not thrown.

import { hmacSha256Hex } from '@/lib/waystaq-discount'

const WAYSTAQ_PREMIUM_ACCESS_URL = 'https://waystaq.com/api/jft-premium-access'

export async function notifyWaystaqPremiumAccess(
  email: string,
  action: 'grant' | 'revoke',
  expiresAt?: string,
): Promise<void> {
  const secret = process.env.WAYSTAQ_BRIDGE_SECRET
  if (!secret) {
    console.error('[waystaq-premium-access] WAYSTAQ_BRIDGE_SECRET not set, skipping', action, 'for', email)
    return
  }

  const normalisedEmail = email.toLowerCase().trim()
  const timestamp = Date.now()
  const message = `${normalisedEmail}|${action}|${expiresAt || ''}|${timestamp}`
  const signature = await hmacSha256Hex(secret, message)

  try {
    const res = await fetch(WAYSTAQ_PREMIUM_ACCESS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalisedEmail, action, expiresAt, timestamp, signature }),
    })
    if (!res.ok) {
      console.error('[waystaq-premium-access]', action, 'failed for', normalisedEmail, res.status, await res.text().catch(() => ''))
    }
  } catch (e) {
    console.error('[waystaq-premium-access]', action, 'error for', normalisedEmail, e)
  }
}
