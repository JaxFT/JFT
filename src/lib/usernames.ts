// Username rules shared between client (input validation, modal
// previews) and server (API enforcement, DB writes).
//
// Format: letters, digits, hyphen, underscore, period. 3-24 chars.
// Case is preserved as typed (Bec stays Bec, not bec). No '@' in
// the username itself, the "this is my Instagram" decision is a
// separate explicit flag (profiles.username_is_instagram) that the
// renderer uses to decide whether to show '@' + link to Instagram.
// Periods can't lead, trail, or appear consecutively (so "jax.travels"
// is fine but ".jax", "jax.", and "jax..travels" are not).
// Uniqueness is enforced case-insensitively in the DB via a unique
// index on lower(username); RESERVED canonicalises further to catch
// sneaky variants of the JFT names (jax.familytravels, jax_family
// travels, JaxFamilyTravels all canonicalise to jaxfamilytravels).

const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,22}[a-zA-Z0-9]$/

// Names we don't want regular users grabbing. Keep this short and
// obvious; the UI will steer real users to something better anyway.
// Compared after canonicalising the username (lowercase + strip
// punctuation), so 'jax.familytravels' and 'JaxFamilyTravels' both
// resolve to 'jaxfamilytravels'.
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'owner',
  'official', 'hello', 'staff',
  'jaxfamilytravels', 'jft', 'jax', 'bec', 'oli',
])

function canonicalReservedKey(u: string): string {
  return u.replace(/^@+/, '').replace(/[._-]/g, '').toLowerCase()
}

export type UsernameCheck = { ok: true } | { ok: false; error: string }

// Preserves case (so 'Oli' stays 'Oli'). Strips any leading '@' the
// user typed by mistake, the dedicated checkbox now controls that.
export function normaliseUsername(input: string): string {
  return input.trim().replace(/^@+/, '')
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
  if (!USERNAME_RE.test(u)) return { ok: false, error: 'Letters, numbers, periods, hyphens, underscores. Must start and end with a letter or number.' }
  if (!opts.bypassReserved && RESERVED.has(canonicalReservedKey(u))) return { ok: false, error: 'That name is reserved, try another.' }
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
