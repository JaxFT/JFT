import { NextResponse } from 'next/server'
import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'
import { stripeClient } from '@/lib/stripe'
import { claimWebGuidePurchase } from '@/lib/claim-web-guide-purchase'
import { sendEmail, HELLO_FROM, ADMIN_NOTIFY, emailShell } from '@/lib/email'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Strict UUID v4-ish shape match. Used to tell whether a Stripe
// session's client_reference_id is one of our call_request rows and
// not some other arbitrary string.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Stripe → /api/stripe/webhook
// Two flows go through the same endpoint:
//  • One-off guide purchases   → checkout.session.completed (mode=payment) → purchases row
//  • Premium subscription      → checkout.session.completed (mode=subscription)
//                                + customer.subscription.{created,updated,deleted}
//                                → profiles.subscription_tier and friends
//
// NEVER skip signature verification — an unsigned POST could be from anywhere.
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, sig, secret)
  } catch (e) {
    return NextResponse.json(
      { error: `Signature verification failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 400 },
    )
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }
  // Service role bypasses RLS. Plain @supabase/supabase-js client.
  // @supabase/ssr's createServerClient folds in cookies and downgrades
  // auth to user-level, which would make these writes fail RLS.
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await handleSubscriptionCheckout(session, admin)
        } else {
          // mode === 'payment'. The 1:1 call Payment Link funnels
          // checkouts here too, distinguished by client_reference_id
          // looking like a uuid (the call_request_id we appended to
          // the URL in the admin composer).
          const callRequestId = typeof session.client_reference_id === 'string'
            ? session.client_reference_id
            : null
          if (callRequestId && UUID_RE.test(callRequestId)) {
            await handleCallRequestPayment(session, callRequestId, admin)
          } else {
            const skip = await handleOneOffCheckout(session, admin)
            if (skip) return skip
          }
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(sub, admin)
        break
      }
      default:
        // Unhandled event types are fine — Stripe sends a lot we don't care about.
        break
    }
  } catch (e) {
    // Non-2xx => Stripe retries with exponential backoff.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook handler error', type: event.type },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}

// ── helpers ──────────────────────────────────────────────────────

async function handleOneOffCheckout(
  session: Stripe.Checkout.Session,
  admin: SupabaseClient,
): Promise<NextResponse | null> {
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true, skipped: 'not paid' })
  }

  // `kind: 'web_guide'` is set by /api/stripe/checkout-web-guide for
  // downloadable web-guide purchases. Everything else (legacy PDF
  // guides, future one-offs) stays on the original products/purchases
  // path.
  if (session.metadata?.kind === 'web_guide') {
    return handleWebGuidePurchase(session, admin)
  }

  // `kind: 'adventure_pack'` is set by /api/stripe/checkout-pack
  // when a free-tier user buys a single country pack at £4.99. The
  // metadata carries user_id + country_slug; we insert into
  // jax_pack_purchases and the access check reads from there.
  if (session.metadata?.kind === 'adventure_pack') {
    await handleAdventurePackPurchase(session, admin)
    return null
  }

  // `kind: 'waystaq_trip_view'` is set by /api/stripe/checkout-trip-view
  // when someone buys view-only access to a JFT trip on WayStaq. The
  // grant itself happens on WayStaq's side, they listen to the same
  // Stripe account; on the JFT side we just nudge the admin inbox so
  // the sale is visible without having to refresh the Stripe Dashboard.
  if (session.metadata?.kind === 'waystaq_trip_view') {
    await handleWaystaqTripViewPurchase(session)
    return null
  }

  const userId = session.metadata?.user_id
  const productId = session.metadata?.product_id
  const amount = session.amount_total
  const paymentIntent = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id

  if (!userId || !productId || amount == null) {
    return NextResponse.json(
      { error: 'Missing metadata on checkout session', session: session.id },
      { status: 400 },
    )
  }

  // unique(user_id, product_id) prevents duplicate rows if Stripe retries.
  const { error } = await admin
    .from('purchases')
    .insert({
      user_id: userId,
      product_id: productId,
      stripe_payment_intent_id: paymentIntent ?? null,
      amount_pence: amount,
    })

  // 23505 = unique_violation: Stripe is retrying a previously-recorded purchase.
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return null
}

async function handleAdventurePackPurchase(
  session: Stripe.Checkout.Session,
  admin: SupabaseClient,
): Promise<void> {
  const userId = session.metadata?.user_id
  const countrySlug = session.metadata?.country_slug
  const paymentIntent = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id
  if (!userId || !countrySlug) {
    console.error('[stripe webhook] adventure_pack missing metadata', { sessionId: session.id })
    return
  }

  // unique(user_id, country_slug) on jax_pack_purchases makes
  // Stripe retries idempotent, the duplicate insert errors as
  // 23505 (unique_violation) which we swallow.
  const { error } = await admin
    .from('jax_pack_purchases')
    .insert({
      user_id: userId,
      country_slug: countrySlug,
      stripe_payment_intent: paymentIntent ?? null,
    })
  if (error && error.code !== '23505') {
    console.error('[stripe webhook] adventure_pack insert failed', error)
  }
  // Fire admin notify only on first time (no error), not on a 23505
  // unique-violation retry, so Stripe webhook re-deliveries don't
  // duplicate the email.
  if (!error) {
    void notifyAdminOfAdventurePackSale(session)
  }
}

async function handleCallRequestPayment(
  session: Stripe.Checkout.Session,
  callRequestId: string,
  admin: SupabaseClient,
): Promise<void> {
  if (session.payment_status !== 'paid') return

  // Find the request so we can email the right address + skip the
  // update if the row no longer exists (manual delete after payment).
  const { data: existing } = await admin
    .from('call_requests')
    .select('id, name, email, paid_at')
    .eq('id', callRequestId)
    .maybeSingle()
  if (!existing) return

  // Idempotency, Stripe retries fine if our 2xx is delayed.
  if (!(existing as { paid_at: string | null }).paid_at) {
    const { error } = await admin
      .from('call_requests')
      .update({ paid_at: new Date().toISOString() })
      .eq('id', callRequestId)
    if (error) {
      console.error('[stripe webhook] failed to mark call_request paid', error)
    }
  }

  // Nudge admin so they don't have to refresh the page to know.
  const row = existing as { name: string; email: string }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  const adminUrl = `${siteUrl}/admin/call-requests#${callRequestId}`
  const subject = `Paid: ${row.name}'s 1:1 call`
  const html = emailShell(subject, `
    <p>${escapeForEmail(row.name)} (${escapeForEmail(row.email)}) just paid for their 1:1 call.</p>
    <p>Send them a confirmation with the agreed date and time, the thread now has a 'Send confirmation' button.</p>
    <p style="margin-top:18px"><a href="${adminUrl}" style="background:#2d6b4f; color:#fff; padding:10px 16px; border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">Open the thread</a></p>
  `)
  void sendEmail({
    from: HELLO_FROM,
    to: ADMIN_NOTIFY,
    subject,
    html,
    text: `${row.name} (${row.email}) just paid for their 1:1 call. Open ${adminUrl} to send the confirmation.`,
    replyTo: row.email,
  })
}

async function handleWaystaqTripViewPurchase(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== 'paid') return

  const tripSlug = typeof session.metadata?.trip_slug === 'string' ? session.metadata.trip_slug : 'unknown'
  const buyerEmail = session.customer_details?.email ?? session.customer_email ?? 'unknown'
  const amountPence = session.amount_total ?? 0
  const amountStr = `£${(amountPence / 100).toFixed(2)}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

  const subject = `Trip-view sale: ${tripSlug} (${buyerEmail})`
  const html = emailShell(subject, `
    <p>Someone just bought view-only access to <strong>${escapeForEmail(tripSlug)}</strong> on WayStaq.</p>
    <p><strong>Buyer:</strong> ${escapeForEmail(buyerEmail)}<br>
       <strong>Amount:</strong> ${amountStr}<br>
       <strong>Stripe session:</strong> ${escapeForEmail(session.id)}</p>
    <p style="font-size:13px; color:#555;">The actual access grant is handled on WayStaq's side, they're listening to the same Stripe account for this metadata kind. This email is just so the sale is visible without refreshing the Stripe Dashboard.</p>
    <p style="margin-top:14px"><a href="${siteUrl}/asia-adventures" style="color:#2d6b4f;">Open the landing page</a></p>
  `)
  void sendEmail({
    from: HELLO_FROM,
    to: ADMIN_NOTIFY,
    subject,
    html,
    text: `Trip-view sale on ${tripSlug}\nBuyer: ${buyerEmail}\nAmount: ${amountStr}\nStripe session: ${session.id}`,
    replyTo: buyerEmail !== 'unknown' ? buyerEmail : undefined,
  })
}

// Admin notifications for the three remaining purchase types. Same
// fire-and-forget pattern as handleWaystaqTripViewPurchase and the 1:1
// call paid email above, so each new sale lands in the shared inbox
// without anyone having to refresh the Stripe Dashboard. Keep templates
// inline rather than in lib/email, the data shape per sale is different
// enough that a generic helper would add more confusion than reuse.

async function notifyAdminOfPremiumSubscription(session: Stripe.Checkout.Session): Promise<void> {
  const buyerEmail = session.customer_details?.email ?? session.customer_email ?? 'unknown'
  const amountPence = session.amount_total ?? 0
  const amountStr = `£${(amountPence / 100).toFixed(2)}`
  // Heuristic: anything under £40 on a Premium signup is almost
  // certainly the £25 WayStaq member price, flag it inline so the inbox
  // makes the source obvious at a glance.
  const discountHint = amountPence > 0 && amountPence < 4000 ? ' (looks like the WayStaq £25 member price)' : ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

  const subject = `Premium signup: ${buyerEmail} (${amountStr})`
  const html = emailShell(subject, `
    <p><strong>${escapeForEmail(buyerEmail)}</strong> just started a JFT Premium subscription.</p>
    <p><strong>Amount:</strong> ${amountStr}${discountHint}<br>
       <strong>Stripe session:</strong> ${escapeForEmail(session.id)}</p>
    <p style="margin-top:14px"><a href="${siteUrl}/admin" style="color:#2d6b4f;">Open admin</a></p>
  `)
  void sendEmail({
    from: HELLO_FROM,
    to: ADMIN_NOTIFY,
    subject,
    html,
    text: `Premium signup\nBuyer: ${buyerEmail}\nAmount: ${amountStr}${discountHint}\nStripe session: ${session.id}`,
    replyTo: buyerEmail !== 'unknown' ? buyerEmail : undefined,
  })
}

async function notifyAdminOfWebGuideSale(session: Stripe.Checkout.Session): Promise<void> {
  const buyerEmail = session.customer_details?.email ?? session.customer_email ?? 'unknown'
  const amountPence = session.amount_total ?? 0
  const amountStr = `£${(amountPence / 100).toFixed(2)}`
  // checkout-web-guide stamps guide_slug into session metadata; fall
  // back to "(unknown)" if absent so the email still goes out.
  const guideSlug = typeof session.metadata?.guide_slug === 'string'
    ? session.metadata.guide_slug
    : typeof session.metadata?.slug === 'string'
      ? session.metadata.slug
      : '(unknown)'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

  const subject = `Web guide sold: ${guideSlug} (${buyerEmail})`
  const html = emailShell(subject, `
    <p><strong>${escapeForEmail(buyerEmail)}</strong> just bought the web guide <strong>${escapeForEmail(guideSlug)}</strong>.</p>
    <p><strong>Amount:</strong> ${amountStr}<br>
       <strong>Stripe session:</strong> ${escapeForEmail(session.id)}</p>
    <p style="margin-top:14px"><a href="${siteUrl}/admin/guides" style="color:#2d6b4f;">Open admin guides</a></p>
  `)
  void sendEmail({
    from: HELLO_FROM,
    to: ADMIN_NOTIFY,
    subject,
    html,
    text: `Web guide sold: ${guideSlug}\nBuyer: ${buyerEmail}\nAmount: ${amountStr}\nStripe session: ${session.id}`,
    replyTo: buyerEmail !== 'unknown' ? buyerEmail : undefined,
  })
}

async function notifyAdminOfAdventurePackSale(session: Stripe.Checkout.Session): Promise<void> {
  const buyerEmail = session.customer_details?.email ?? session.customer_email ?? 'unknown'
  const amountPence = session.amount_total ?? 0
  const amountStr = `£${(amountPence / 100).toFixed(2)}`
  const country = typeof session.metadata?.country_slug === 'string'
    ? session.metadata.country_slug
    : '(unknown)'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

  const subject = `Adventure Pack sold: ${country} (${buyerEmail})`
  const html = emailShell(subject, `
    <p><strong>${escapeForEmail(buyerEmail)}</strong> just bought the <strong>${escapeForEmail(country)}</strong> Adventure Pack.</p>
    <p><strong>Amount:</strong> ${amountStr}<br>
       <strong>Stripe session:</strong> ${escapeForEmail(session.id)}</p>
    <p style="margin-top:14px"><a href="${siteUrl}/adventure-packs/${encodeURIComponent(country)}" style="color:#2d6b4f;">Open the pack landing</a></p>
  `)
  void sendEmail({
    from: HELLO_FROM,
    to: ADMIN_NOTIFY,
    subject,
    html,
    text: `Adventure Pack sold: ${country}\nBuyer: ${buyerEmail}\nAmount: ${amountStr}\nStripe session: ${session.id}`,
    replyTo: buyerEmail !== 'unknown' ? buyerEmail : undefined,
  })
}

// Tiny local helper, the email module exports emailShell but not its
// own escaper. Keep it private here so the webhook file stays
// self-contained.
function escapeForEmail(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function handleWebGuidePurchase(
  session: Stripe.Checkout.Session,
  _admin: SupabaseClient,
): Promise<NextResponse | null> {
  // Shared with the success-page handler — finds or creates the user
  // from Stripe's collected email and records the purchase. Idempotent.
  const r = await claimWebGuidePurchase({ session })
  if (!r.ok) {
    return NextResponse.json({ error: r.error, session: session.id }, { status: r.status })
  }
  // Admin notify on every success. The underlying claim is idempotent
  // (re-runs are silent), but doesn't expose a first-vs-retry flag, so
  // a rare Stripe redelivery could send a duplicate email. Acceptable.
  void notifyAdminOfWebGuideSale(session)
  return null
}

async function handleSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  admin: SupabaseClient,
) {
  const userId = session.metadata?.user_id
  if (!userId) {
    throw new Error(`Subscription checkout session ${session.id} missing user_id metadata`)
  }
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id ?? null
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id ?? null

  // Snapshot the profile's existing subscription id BEFORE we overwrite
  // it, so we can tell a brand-new signup apart from a Stripe webhook
  // retry on the same subscription id, and only email the admin in the
  // brand-new case.
  const { data: priorProfile } = await admin
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', userId)
    .maybeSingle()
  const priorSubId = (priorProfile as { stripe_subscription_id?: string | null } | null)?.stripe_subscription_id ?? null
  const isFirstTimeSubscription = !priorSubId || (!!subscriptionId && priorSubId !== subscriptionId)

  // Stamp the customer id immediately. The expiry + tier will be set by
  // the customer.subscription.created event that fires alongside this one,
  // which has the period end. We don't need to do anything else here.
  if (customerId) {
    const { error } = await admin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
    if (error) throw new Error(`Could not store stripe_customer_id: ${error.message}`)
  }
  // Defensive: if the subscription event has already arrived first (rare,
  // but Stripe doesn't guarantee order), make sure the subscription_id is
  // stored too. handleSubscriptionChange uses customer_id to find the user
  // in that case, so this is just belt-and-braces.
  if (subscriptionId) {
    await admin
      .from('profiles')
      .update({ stripe_subscription_id: subscriptionId })
      .eq('id', userId)
  }
  if (isFirstTimeSubscription) {
    void notifyAdminOfPremiumSubscription(session)
  }
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription,
  admin: SupabaseClient,
) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  // Find the user. Prefer subscription metadata (set on creation in /subscribe),
  // fall back to looking up by customer id, which is always set on the profile
  // by handleSubscriptionCheckout before the first subscription event.
  let userId = sub.metadata?.user_id || null
  if (!userId) {
    const { data: row } = await admin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    userId = row?.id ?? null
  }
  if (!userId) {
    throw new Error(`Could not resolve user for subscription ${sub.id} (customer ${customerId})`)
  }

  // Active means: actively paying OR in a paid period that hasn't lapsed.
  // 'trialing' counts too if we ever add trials.
  const activeStatuses: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due']
  const isActive = activeStatuses.includes(sub.status)

  // current_period_end is unix seconds.
  const expiresAt = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null

  // cancel_at_period_end is true while a cancel request is pending; clears
  // back to false if they undo it via the Customer Portal. Keep our flag in
  // sync so the account page "Cancellation requested on …" message is right.
  const cancellationRequestedAt = sub.cancel_at_period_end
    ? (sub.canceled_at
        ? new Date(sub.canceled_at * 1000).toISOString()
        : new Date().toISOString())
    : null

  const update: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    subscription_tier: isActive ? 'premium' : 'free',
    subscription_expires_at: expiresAt,
    cancellation_requested_at: cancellationRequestedAt,
  }

  const { error } = await admin
    .from('profiles')
    .update(update)
    .eq('id', userId)
  if (error) throw new Error(`Could not update profile for ${userId}: ${error.message}`)
}
