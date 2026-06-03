// Stripe checkout for a one-off WayStaq trip-view purchase, currently
// just "Asia Adventures". Unlike the Adventure Pack checkout this does
// NOT require a JFT sign-in: the buyer's relationship is with the trip
// view on WayStaq, not with JFT, and forcing a JFT account before paying
// would add friction for no gain. Stripe collects the email and we put
// it in the metadata, then WayStaq's webhook listener (on the shared
// Stripe account) reads the same event and grants view-only access to
// that email on the trip_slug.
//
// success_url goes to /asia-adventures/thanks which then bounces them
// out to WayStaq once WAYSTAQ_ASIA_ADVENTURES_URL is set. Keeping the
// landing in our hands means we control the post-pay UX while WayStaq's
// route is still being wired up, no Stripe config change later.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TRIP_SLUG = 'asia-adventures'

export async function POST(request: Request) {
  const priceId = process.env.STRIPE_PRICE_ASIA_ADVENTURES_VIEW
  if (!priceId) {
    return NextResponse.json(
      { error: 'Trip-view price not configured (STRIPE_PRICE_ASIA_ADVENTURES_VIEW).' },
      { status: 500 },
    )
  }

  // Sign-in optional; if they happen to be logged in we stamp the
  // user_id so the future JFT admin view can join sales to JFT accounts
  // where one exists. WayStaq's grant only depends on the email.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const origin = new URL(request.url).origin
  const stripe = stripeClient()

  const metadata: Record<string, string> = {
    kind: 'waystaq_trip_view',
    trip_slug: TRIP_SLUG,
  }
  if (user?.id) metadata.jft_user_id = user.id

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/asia-adventures/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/asia-adventures?purchase=cancelled`,
      ...(user?.email ? { customer_email: user.email } : {}),
      metadata,
      payment_intent_data: { metadata },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }

    // Stamp purchase_id = session.id onto the session + payment intent
    // metadata so WayStaq's webhook can dedupe retries on it. session.id
    // isn't known at create time, so this has to be a second call.
    // Best-effort: if the patch fails, WayStaq can still dedupe on
    // event.data.object.id directly from the webhook payload.
    try {
      const withPurchaseId = { ...metadata, purchase_id: session.id }
      await stripe.checkout.sessions.update(session.id, { metadata: withPurchaseId })
      if (typeof session.payment_intent === 'string') {
        await stripe.paymentIntents.update(session.payment_intent, { metadata: withPurchaseId })
      }
    } catch (e) {
      console.error('[checkout-trip-view] purchase_id stamp failed', e)
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 500 },
    )
  }
}
