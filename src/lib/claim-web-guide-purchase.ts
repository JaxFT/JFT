// Server-side "turn a paid Stripe session into a recorded purchase
// against a Supabase user" helper. Shared by:
//   • the webhook (async, reliable backstop)
//   • the success-page handler (sync, gets the buyer signed in
//     and the download button live immediately on return)
//
// Idempotent. Safe to call from both paths for the same session —
// the unique constraint on web_guide_purchases means only the first
// insert sticks; later calls are no-ops.

import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
import { stripeClient } from '@/lib/stripe'
import type Stripe from 'stripe'

export type ClaimResult =
  | { ok: true; userId: string; email: string; guideId: string; createdUser: boolean }
  | { ok: false; error: string; status: number }

function adminClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Find a Supabase user by email — listUsers is the only admin path
// that gives us this lookup, and we filter client-side because the
// admin API doesn't accept an email filter directly. Realistically
// the user count is small enough that this is fine; if it grows
// past a few thousand we'd index by email in a profile table.
async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const lower = email.toLowerCase()
  // perPage 1000 is the max. For now we just check page 1 — every
  // active user fits. Add pagination later if needed.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`listUsers failed: ${error.message}`)
  const match = data.users.find(u => u.email?.toLowerCase() === lower)
  return match?.id ?? null
}

async function findOrCreateUser(
  admin: SupabaseClient,
  email: string,
): Promise<{ userId: string; created: boolean }> {
  const existing = await findUserIdByEmail(admin, email)
  if (existing) return { userId: existing, created: false }
  // Create the account with no password. They'll log in via the
  // magic link sent from the success page (and any future logins).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true, // they proved ownership by paying via this email
  })
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message ?? 'no user returned'}`)
  }
  return { userId: data.user.id, created: true }
}

// Claim a paid Stripe checkout session: ensure a user exists for the
// buyer email and a web_guide_purchases row exists for (user, guide).
//
// Accepts either a Stripe session object (webhook path, already
// fetched) or just a session_id (success-page path, we'll fetch it).
export async function claimWebGuidePurchase(
  input: { session: Stripe.Checkout.Session } | { sessionId: string },
): Promise<ClaimResult> {
  let session: Stripe.Checkout.Session
  if ('session' in input) {
    session = input.session
  } else {
    try {
      session = await stripeClient().checkout.sessions.retrieve(input.sessionId)
    } catch (e) {
      return { ok: false, error: `Stripe lookup failed: ${e instanceof Error ? e.message : 'unknown'}`, status: 400 }
    }
  }

  if (session.payment_status !== 'paid') {
    return { ok: false, error: 'Payment not completed', status: 402 }
  }
  if (session.metadata?.kind !== 'web_guide') {
    return { ok: false, error: 'Not a web-guide checkout', status: 400 }
  }

  const guideId = session.metadata?.guide_id
  const amount = session.amount_total
  const paymentIntent = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null
  // Stripe stores the email on customer_details when collected during
  // checkout, or on customer_email if we preloaded it for a signed-in user.
  const email =
    session.customer_details?.email ?? session.customer_email ?? null

  if (!guideId || amount == null) {
    return { ok: false, error: 'Missing guide_id/amount on session', status: 400 }
  }

  const admin = adminClient()

  // Resolve the user: metadata wins if we put it there (signed-in
  // buyer), otherwise turn the Stripe-collected email into a user.
  let userId = session.metadata?.user_id ?? null
  let createdUser = false
  let resolvedEmail = email
  if (!userId) {
    if (!email) return { ok: false, error: 'No email on Stripe session', status: 400 }
    const r = await findOrCreateUser(admin, email)
    userId = r.userId
    createdUser = r.created
    resolvedEmail = email
  } else if (!resolvedEmail) {
    // Best-effort fill so the caller can show the right address.
    const { data } = await admin.auth.admin.getUserById(userId)
    resolvedEmail = data.user?.email ?? null
  }

  const { error } = await admin
    .from('web_guide_purchases')
    .insert({
      user_id: userId,
      guide_id: guideId,
      stripe_payment_intent_id: paymentIntent,
      amount_pence: amount,
    })
  // 23505 = unique_violation: already recorded by an earlier call
  // (the other path or a Stripe retry). Not an error.
  if (error && error.code !== '23505') {
    return { ok: false, error: error.message, status: 500 }
  }

  return {
    ok: true,
    userId,
    email: resolvedEmail ?? '',
    guideId,
    createdUser,
  }
}

// Generate a magic-link URL for the given email and (optional) next
// path. Used by the success page to sign the buyer in immediately
// without them having to find an email.
export async function generateMagicLinkUrl(
  email: string,
  redirectTo: string,
): Promise<string | null> {
  const admin = adminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })
  if (error || !data.properties?.action_link) return null
  return data.properties.action_link
}
