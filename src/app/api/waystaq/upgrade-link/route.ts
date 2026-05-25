// Mints a short-lived HMAC-signed token that proves to WayStaq that
// the current visitor is a paid JFT premium member. WayStaq's
// /api/jft-upgrade endpoint verifies the signature AND independently
// rechecks Stripe before granting the £25 discount, so even within the
// 15-minute window only real members get the price drop.
//
// Token shape after base64url-encoding:
//   <email>|<timestamp_ms>|<hex_hmac_sha256>
// Signed with WAYSTAQ_BRIDGE_SECRET (encrypted Worker secret).
//
// Spec: shared with the WayStaq side's JFT_BRIDGE_SECRET — both env
// vars must hold the SAME value or the signature check fails.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const WAYSTAQ_BRIDGE_URL = 'https://waystaq.com/api/jft-upgrade'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    if (!isPremiumTier(profile?.subscription_tier)) {
      return NextResponse.json({ error: 'Premium membership required' }, { status: 403 })
    }

    const email = user.email
    if (!email) {
      return NextResponse.json({ error: 'No email on account' }, { status: 400 })
    }

    const secret = process.env.WAYSTAQ_BRIDGE_SECRET
    if (!secret) {
      console.error('[waystaq-upgrade-link] WAYSTAQ_BRIDGE_SECRET not set')
      return NextResponse.json({ error: 'Bridge not configured' }, { status: 500 })
    }

    const ts = Date.now()
    const message = `${email}|${ts}`
    const sig = await hmacSha256Hex(secret, message)
    const raw = `${email}|${ts}|${sig}`
    const token = base64url(raw)

    return NextResponse.json({
      url: `${WAYSTAQ_BRIDGE_URL}?token=${encodeURIComponent(token)}`,
    })
  } catch (e) {
    console.error('[waystaq-upgrade-link] error', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    )
  }
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

function base64url(s: string): string {
  // Byte-safe base64 (handles non-ASCII characters in the rare case an
  // email or signature contains them, even though both should be ASCII).
  const bytes = new TextEncoder().encode(s)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
