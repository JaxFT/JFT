import type { Metadata } from 'next'
import { Check, Mail, ArrowRight } from 'lucide-react'
import { stripeClient } from '@/lib/stripe'

// Post-Stripe-success landing. We DO NOT auto-redirect to WayStaq's
// /redeem URL: their endpoint expects a tokenised link delivered via
// their confirmation email, and bouncing the buyer there without a
// token throws "Missing pass token". So we land them here, tell them
// what's happening, and let WayStaq's email do the actual claim hop.
//
// The Stripe session lookup is just to surface the buyer's email back
// to them so they know which inbox to check.

export const metadata: Metadata = {
  title: 'Thanks, your access is on its way',
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

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment received</h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-5">
            Thanks. WayStaq will send you a link to your inbox in the next few minutes with everything you need to open the trip.
          </p>
          {email && (
            <div className="bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 mb-5 inline-flex items-center gap-2 max-w-full">
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-sm text-gray-700 truncate">
                Sent to <strong>{email}</strong>
              </span>
            </div>
          )}
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            Check your spam folder if you don&apos;t see it. If it hasn&apos;t arrived within an hour, email us at{' '}
            <a href="mailto:hello@jaxfamilytravels.com" className="text-brand-700 font-semibold hover:underline">
              hello@jaxfamilytravels.com
            </a>{' '}
            and we&apos;ll sort it.
          </p>
          <a
            href="https://waystaq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full justify-center py-2.5"
          >
            Open WayStaq <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
