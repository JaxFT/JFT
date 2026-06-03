import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { stripeClient } from '@/lib/stripe'

// Server-side bounce from Stripe success into WayStaq's /redeem page
// with the buyer's email pre-filled. We need this hop because Stripe's
// success_url interpolation only supports {CHECKOUT_SESSION_ID}, not
// {CUSTOMER_EMAIL}; we look the email up here from the session, then
// redirect (307) on. End user just sees Stripe success, a beat, then
// WayStaq's thanks-and-sign-in screen.

export const metadata: Metadata = {
  title: 'Thanks, redirecting to WayStaq',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AsiaAdventuresThanks({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  let email = ''
  if (session_id) {
    try {
      const stripe = stripeClient()
      const session = await stripe.checkout.sessions.retrieve(session_id)
      email = session.customer_details?.email ?? session.customer_email ?? ''
    } catch (e) {
      console.error('[asia-adventures/thanks] session retrieve failed', e)
    }
  }

  const base = process.env.WAYSTAQ_ASIA_ADVENTURES_URL || 'https://waystaq.com/redeem?trip=asia-adventures'
  const sep = base.includes('?') ? '&' : '?'
  const dest = email ? `${base}${sep}email=${encodeURIComponent(email)}` : base

  redirect(dest)
}
