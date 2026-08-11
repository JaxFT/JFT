// Server-side "turn a paid Stripe session into a recorded purchase
// against a Supabase user" helper for the legacy PDF guides (products
// table). Mirrors claim-web-guide-purchase.ts exactly, targeting
// purchases/products instead of web_guide_purchases/guides — the two
// checkout flows used to diverge here (this one required sign-in
// before checkout, the web-guide one didn't), which is what let a
// guest's payment go through on Stripe with nothing recorded on our
// side. Bringing them to parity.
//
// Idempotent, safe to call from both the webhook (async backstop) and
// the success-page handler (sync, unlocks the page immediately) — the
// unique(user_id, product_id) constraint means only the first insert
// for a given session sticks.

import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
import { stripeClient } from '@/lib/stripe'
import { findUserIdByEmail } from '@/lib/find-user-by-email'
import type Stripe from 'stripe'

export type ClaimResult =
  | { ok: true; userId: string; email: string; productId: string; createdUser: boolean }
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

// Claim a paid Stripe checkout session for a one-off guide purchase:
// ensure a user exists for the buyer email and a purchases row exists
// for (user, product). Accepts either an already-fetched Stripe
// session (webhook path) or just a session_id (success-page path).
export async function claimGuidePurchase(
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
  // Guard against being handed a session from a different flow
  // (premium subscription, adventure pack, web guide, ...).
  if (session.metadata?.kind && session.metadata.kind !== 'guide_one_off') {
    return { ok: false, error: 'Not a one-off guide checkout', status: 400 }
  }

  const productId = session.metadata?.product_id
  const amount = session.amount_total
  const paymentIntent = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null
  const email =
    session.customer_details?.email ?? session.customer_email ?? null

  if (!productId || amount == null) {
    return { ok: false, error: 'Missing product_id/amount on session', status: 400 }
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
    const { data } = await admin.auth.admin.getUserById(userId)
    resolvedEmail = data.user?.email ?? null
  }

  const { error } = await admin
    .from('purchases')
    .insert({
      user_id: userId,
      product_id: productId,
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
    productId,
    createdUser,
  }
}
