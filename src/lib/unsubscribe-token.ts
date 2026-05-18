// HMAC-signed unsubscribe tokens. Embedded in the footer of every
// marketing email so the recipient can opt out in one click without
// logging in (UK PECR requires the link to actually work, no friction).
//
// Format: `<base64url(payload)>.<base64url(hmac)>`
// Payload: JSON { uid: <user_id>, exp: <ms epoch> } — 1 year expiry.
//
// The signing secret is UNSUBSCRIBE_SIGNING_SECRET, set as a Worker
// secret. If absent, signing/verifying returns null and the caller
// falls back to a manual "email us" path.

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

function getSecret(): string | null {
  return process.env.UNSUBSCRIBE_SIGNING_SECRET ?? null
}

function base64urlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input)
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input)
  } else {
    bytes = input
  }
  let bin = ''
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecodeToString(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return base64urlEncode(sig)
}

// Constant-time string compare to avoid timing attacks on the signature.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function signUnsubscribeToken(userId: string): Promise<string | null> {
  const secret = getSecret()
  if (!secret) return null
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + ONE_YEAR_MS })
  const data = base64urlEncode(payload)
  const sig = await hmac(secret, data)
  return `${data}.${sig}`
}

export async function verifyUnsubscribeToken(token: string): Promise<{ ok: true; uid: string } | { ok: false; error: string }> {
  const secret = getSecret()
  if (!secret) return { ok: false, error: 'Unsubscribe is not configured on the server' }
  if (!token || !token.includes('.')) return { ok: false, error: 'Bad link' }
  const [data, sig] = token.split('.')
  if (!data || !sig) return { ok: false, error: 'Bad link' }
  const expected = await hmac(secret, data)
  if (!timingSafeEqual(sig, expected)) return { ok: false, error: 'Bad signature — link may have been altered' }

  let payload: { uid?: string; exp?: number }
  try {
    payload = JSON.parse(base64urlDecodeToString(data))
  } catch {
    return { ok: false, error: 'Bad link payload' }
  }
  if (!payload.uid || typeof payload.uid !== 'string') return { ok: false, error: 'No user in token' }
  if (typeof payload.exp === 'number' && Date.now() > payload.exp) return { ok: false, error: 'This link has expired — please update your preferences from your account page instead' }
  return { ok: true, uid: payload.uid }
}

// Convenience: build the full unsubscribe URL for a given user.
// Returns null if the signing secret isn't configured.
export async function buildUnsubscribeUrl(userId: string): Promise<string | null> {
  const token = await signUnsubscribeToken(userId)
  if (!token) return null
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  return `${base}/unsubscribe?t=${encodeURIComponent(token)}`
}
