// Username rules shared between client (input validation, modal
// previews) and server (API enforcement, DB writes).
//
// Format: lowercase a-z, 0-9, hyphen, underscore. 3–24 characters.
// We force lowercase on submit so "BecKBaker" → "beckbaker"; the
// database also has a unique lowercase index as a backstop.

const USERNAME_RE = /^[a-z0-9_-]{3,24}$/

// Names we don't want regular users grabbing. Keep this short and
// obvious; the UI will steer real users to something better anyway.
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'owner',
  'official', 'hello', 'staff',
  'jaxfamilytravels', 'jft', 'jax', 'bec', 'oli',
])

export type UsernameCheck = { ok: true } | { ok: false; error: string }

export function normaliseUsername(input: string): string {
  return input.trim().toLowerCase()
}

export function validateUsername(raw: string): UsernameCheck {
  const u = normaliseUsername(raw)
  if (!u) return { ok: false, error: 'Pick a username so other readers know who left the comment.' }
  if (u.length < 3) return { ok: false, error: 'At least 3 characters.' }
  if (u.length > 24) return { ok: false, error: 'Keep it under 24 characters.' }
  if (!USERNAME_RE.test(u)) return { ok: false, error: 'Letters, numbers, hyphens, underscores only.' }
  if (RESERVED.has(u)) return { ok: false, error: 'That name is reserved — try another.' }
  return { ok: true }
}

// Instagram handle is optional and a bit looser. Strip a leading @
// the user might paste in, then validate against Instagram's own
// charset rules (letters, digits, period, underscore; 1–30 chars).
const INSTA_RE = /^[a-zA-Z0-9._]{1,30}$/

export function normaliseInstagram(input: string): string {
  return input.trim().replace(/^@/, '')
}

export function validateInstagram(raw: string): UsernameCheck {
  const i = normaliseInstagram(raw)
  if (!i) return { ok: true } // optional field — empty is fine
  if (!INSTA_RE.test(i)) {
    return { ok: false, error: 'Use the part after the @, letters/numbers/period/underscore only.' }
  }
  return { ok: true }
}
