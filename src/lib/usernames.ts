// Username rules shared between client (input validation, modal
// previews) and server (API enforcement, DB writes).
//
// Format: letters, digits, hyphen, underscore, period. 3-24 chars.
// Case is preserved as typed (Bec stays Bec, not bec). An optional
// leading '@' is allowed for users who want their handle to display
// like an Instagram name (e.g. @jax.familytravels), the rest of the
// UI no longer auto-prefixes @ on usernames.
// Periods can't lead, trail, or appear consecutively (so "jax.travels"
// is fine but ".jax", "jax.", and "jax..travels" are not).
// Uniqueness is enforced case-insensitively in the DB via a unique
// index on lower(username); we mirror that in RESERVED below.

const USERNAME_RE = /^@?[a-zA-Z0-9][a-zA-Z0-9._-]{1,22}[a-zA-Z0-9]$/

// Names we don't want regular users grabbing. Keep this short and
// obvious; the UI will steer real users to something better anyway.
// Compared case-insensitively against the username with any leading
// @ stripped, so '@bec' and 'BEC' both hit 'bec'.
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'owner',
  'official', 'hello', 'staff',
  'jaxfamilytravels', 'jft', 'jax', 'bec', 'oli',
])

export type UsernameCheck = { ok: true } | { ok: false; error: string }

// Preserves case (so 'Oli' stays 'Oli'). Trims and collapses an
// accidental double-@ at the start. Uniqueness is handled DB-side.
export function normaliseUsername(input: string): string {
  return input.trim().replace(/^@+/, '@').replace(/^@(?=$)/, '')
}

// `bypassReserved` lets admin accounts claim names from the RESERVED
// list. Those names exist to keep random users from grabbing
// 'jaxfamilytravels' / 'bec' / 'oli' etc, but the real Bec and Oli
// obviously need to be able to use their own names.
export function validateUsername(raw: string, opts: { bypassReserved?: boolean } = {}): UsernameCheck {
  const u = normaliseUsername(raw)
  if (!u) return { ok: false, error: 'Pick a username so other readers know who left the comment.' }
  if (u.length < 3) return { ok: false, error: 'At least 3 characters.' }
  if (u.length > 24) return { ok: false, error: 'Keep it under 24 characters.' }
  if (u.includes('..')) return { ok: false, error: 'No two periods in a row.' }
  if (!USERNAME_RE.test(u)) return { ok: false, error: 'Letters, numbers, periods, hyphens, underscores. Must start and end with a letter or number. An optional @ at the very start is allowed.' }
  const reservedKey = u.replace(/^@/, '').toLowerCase()
  if (!opts.bypassReserved && RESERVED.has(reservedKey)) return { ok: false, error: 'That name is reserved, try another.' }
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
