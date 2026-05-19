import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/stripe/cancel
// Cancels the user's premium subscription at the end of the current period.
// They keep access until subscription_expires_at, then the webhook
// (customer.subscription.deleted) flips them back to free.
//
// We stamp cancellation_requested_at locally so the account page can show
// "Cancellation requested on …" immediately, without waiting for the
// webhook round-trip.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Please sign in.', signInUrl: '/login?next=/account' },
      { status: 401 },
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, subscription_tier, cancellation_requested_at')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.subscription_tier !== 'premium' || !profile.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'No active premium subscription to cancel.' },
      { status: 400 },
    )
  }
  if (profile.cancellation_requested_at) {
    return NextResponse.json({ ok: true, already: true })
  }

  const stripe = stripeClient()

  try {
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 500 },
    )
  }

  // Stamp the request time. Service role so we bypass RLS, same pattern as the webhook.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { error } = await admin
    .from('profiles')
    .update({ cancellation_requested_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
