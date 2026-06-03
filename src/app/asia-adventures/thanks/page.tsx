import type { Metadata } from 'next'
import { Check, Mail, ArrowRight } from 'lucide-react'
import { stripeClient } from '@/lib/stripe'

// Post-Stripe-success branded landing. We don't auto-redirect, because:
//   - Stripe's success_url placeholder language only officially supports
//     {CHECKOUT_SESSION_ID}, so we can't bake the buyer's email straight
//     into the WayStaq /redeem URL from Stripe alone; we have to look it
//     up here from the session.
//   - The branded confirmation moment is the natural emotional high
//     point after paying. Cheap to keep, useful for reassurance.
//
// The flow now: buyer pays on Stripe → lands here → sees "Payment
// received" + the email Stripe collected + a prominent "Activate your
// WayStaq access" button that takes them to /redeem with email
// pre-filled. They also get a confirmation email from WayStaq with the
// same link, so closing the tab is recoverable.

export const metadata: Metadata = {
  title: 'Thanks, your access is ready',
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
  const activateUrl = email ? `${base}${sep}email=${encodeURIComponent(email)}` : base

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment received</h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-5">
            Thanks. Click below to activate your view-only access on WayStaq. If you don&apos;t have a WayStaq account yet you&apos;ll create one on the next page; if you do, just sign in.
          </p>
          <a
            href={activateUrl}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            Activate your WayStaq access <ArrowRight className="w-4 h-4" />
          </a>
          {email && (
            <div className="bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 mt-5 inline-flex items-center gap-2 max-w-full">
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-sm text-gray-700 truncate">
                Same link also sent to <strong>{email}</strong>
              </span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            Closed the tab? Check your email (and your spam folder) for the same activation link from WayStaq. If it&apos;s not there within an hour,{' '}
            <a href="mailto:hello@jaxfamilytravels.com" className="text-brand-700 font-semibold hover:underline">
              email us
            </a>
            {' '}and we&apos;ll sort it.
          </p>
        </div>
      </div>
    </div>
  )
}
