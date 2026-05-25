# WayStaq Bridge: JFT-Side Implementation

**Purpose.** Hand this to the WayStaq-side AI / engineer so they can build (or sanity-check) `https://waystaq.com/api/jft-upgrade` against the exact contract JFT now ships.

JFT-side code lives in this repo:

- `src/app/api/waystaq/upgrade-link/route.ts` — token minter
- `src/components/WaystaqDiscountButton.tsx` — client button
- `src/components/WaystaqCard.tsx` — premium-aware CTA rendering

---

## The redirect URL JFT sends visitors to

```
https://waystaq.com/api/jft-upgrade?token=<base64url_token>
```

That's it. Single GET request, query-string token. JFT does a full-page `window.location.href = url` redirect — not an iframe, popup, or `fetch`.

---

## Token format

The `token` query param is **base64url-encoded** (URL-safe variant: `+`→`-`, `/`→`_`, no `=` padding). When decoded back to bytes and read as UTF-8, it's a single string:

```
<email>|<timestamp_ms>|<hex_hmac_sha256>
```

Three pipe-separated fields. Concretely:

- **email** — the JFT user's authenticated email (always ASCII in practice; spec allows any RFC-compliant email)
- **timestamp_ms** — JavaScript `Date.now()` value at the moment JFT minted the token. Unix epoch in **milliseconds**, not seconds.
- **hex_hmac_sha256** — lowercase hex string, 64 chars, of `HMAC-SHA256(secret, "<email>|<timestamp_ms>")`

Important: the signed message is **just `email|timestamp_ms`**, the first two fields joined with a single pipe. The signature itself is then appended (with another pipe) before base64url-encoding the whole thing.

### Decoding example (Node / Cloudflare Workers)

```js
function decodeToken(rawToken) {
  // base64url → base64
  const b64 = rawToken.replace(/-/g, '+').replace(/_/g, '/')
  // pad
  const padded = b64 + '='.repeat((4 - b64.length % 4) % 4)
  const decoded = atob(padded)
  const [email, tsStr, sig] = decoded.split('|')
  return { email, timestamp: Number(tsStr), signature: sig }
}
```

---

## Signature verification

```js
async function isValidSignature(secret, email, timestamp, signature) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${email}|${timestamp}`))
  const expected = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  // Constant-time compare — don't bail on first mismatching char.
  return constantTimeEqual(expected, signature)
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
```

The `secret` here is the shared bridge value — `JFT_BRIDGE_SECRET` on the WayStaq side, identical to `WAYSTAQ_BRIDGE_SECRET` on the JFT side.

---

## Expiry

Reject tokens whose `timestamp_ms` is older than **15 minutes** (900_000 ms) from `Date.now()` at verification time. JFT mints them at request time so the visitor has plenty of headroom; anything older is almost certainly a shared / replayed link.

Tokens with timestamps from the *future* by more than a small skew tolerance (say 60 seconds) should also be rejected — defends against clock-skew abuse.

```js
const TOKEN_TTL_MS = 15 * 60 * 1000
const CLOCK_SKEW_MS = 60 * 1000
const now = Date.now()
if (timestamp + TOKEN_TTL_MS < now) return reject('expired')
if (timestamp - CLOCK_SKEW_MS > now)  return reject('future-dated')
```

---

## Environment variable on WayStaq's side

```
JFT_BRIDGE_SECRET = <same 64-hex-char value as JFT's WAYSTAQ_BRIDGE_SECRET>
```

Default value JFT is using right now:

```
94ca4ce80b60ceda08b71281a599bd4fee500a096af81c8c2fcdd37ccc60a150
```

If rotated, both sides must change together — there's no graceful overlap window in this design (tokens are short-lived enough that "rotate, redeploy both within 15 min" works fine).

---

## Stripe re-check (defence against token sharing)

**JFT does NOT expose a verify-this-email endpoint.** WayStaq's Stripe re-check has to happen however WayStaq already does it (querying its own Stripe customer records, since both products bill through what we assume is the same Stripe account but with different products).

If you'd prefer a JFT-side verify endpoint instead (e.g. WayStaq calls JFT to confirm premium status before honouring the token), say so and we'll add `GET /api/waystaq/verify?token=...` on the JFT side that returns `{ premium: true | false }`.

---

## What JFT guarantees about minted tokens

✅ The visitor was authenticated against Supabase as a real JFT user when the token was minted.
✅ At mint time, their `profiles.subscription_tier` was a Premium value (per `isPremiumTier()` in `src/lib/profile.ts`).
✅ The email in the token matches `auth.users.email` for that account.
✅ The timestamp is a real `Date.now()` from JFT's server (CF Worker), not user-supplied.
✅ The signature is computed with the shared secret server-side; the secret is never sent to the browser.

## What JFT does NOT guarantee

❌ That the user is still premium at verification time — Premium could have been cancelled in the ~15 min window. That's why the Stripe re-check matters.
❌ That the email is verified by Supabase. We use whatever email is on the auth record. (For practical purposes this is verified; Supabase confirms email on signup.)
❌ That the token will only be used once. JFT doesn't track minted tokens. WayStaq can if it wants to (the timestamp gives a natural-enough idempotency key per email).

---

## Failure modes JFT's endpoint can return

Visitor's browser hits `GET /api/waystaq/upgrade-link` on JFT. The button JS treats every non-2xx as a fall-through to the regular `waystaq.com` URL. The endpoint returns:

| Status | Body | When |
|---|---|---|
| 200 | `{ url: "https://waystaq.com/api/jft-upgrade?token=..." }` | Authenticated premium user |
| 401 | `{ error: "Sign in first" }` | No Supabase session |
| 403 | `{ error: "Premium membership required" }` | Signed in but not premium |
| 400 | `{ error: "No email on account" }` | Edge case — Supabase user with no email |
| 500 | `{ error: "Bridge not configured" }` | `WAYSTAQ_BRIDGE_SECRET` missing on JFT's worker |
| 500 | `{ error: "Unknown error" }` | Any unhandled throw |

So if the visitor reaches WayStaq with a token at all, it passed the JFT-side authentication + premium check. WayStaq's re-check is belt-and-braces for the 15-min window plus replay attempts.

---

## End-to-end happy path

1. JFT premium user clicks "Get Waystaq for £25 (Premium member)" on jaxfamilytravels.com
2. Browser → `GET https://jaxfamilytravels.com/api/waystaq/upgrade-link` (cookies forwarded)
3. JFT server authenticates via Supabase, confirms premium, mints token, returns `{ url }`
4. Browser → `window.location.href = url` → lands on `https://waystaq.com/api/jft-upgrade?token=...`
5. WayStaq side: parse token, verify signature with `JFT_BRIDGE_SECRET`, check expiry, re-check Stripe, redirect to £25 Payment Link
6. User pays £25, gets WayStaq Premium

## Failure handling — always land on waystaq.com

If anything goes wrong at step 5 (no token, expired, forged signature, Stripe says not-premium, missing env var, anything else), the WayStaq side should **redirect the visitor to `https://waystaq.com/` — the WayStaq homepage — and never render an error page**. The visitor explores WayStaq normally and can sign up at the standard £50 anywhere on the site if they choose.

JFT already follows the same rule on its side: if the JFT endpoint returns any non-2xx (visitor not signed in, not premium, secret missing, anything), the button JS falls back to `window.location.href = 'https://waystaq.com'`. No JFT-side error page is ever shown either.

So the user's worst-case experience is: "I clicked the button on JFT, I ended up on the WayStaq homepage." Never "I clicked the button on JFT and got a 4xx / 5xx page."
