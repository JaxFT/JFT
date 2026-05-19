import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/stripe/portal
// Returns a Stripe Customer Portal session URL. Used for the "Manage
// billing" link on the account page (update card, view invoices, etc.).
// Cancellation goes through /api/stripe/cancel instead, so that flow
// stays in our UI and our DB stamps cancellation_requested_at.
export async function POST(request: Request) {
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
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe customer on file. Subscribe first to manage billing.' },
      { status: 400 },
    )
  }

  const origin = new URL(request.url).origin

  try {
    const stripe = stripeClient()
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/account`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 500 },
    )
  }
}
