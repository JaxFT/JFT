import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'

// Post-purchase landing after Stripe success. JFT controls this UX
// instead of redirecting straight to WayStaq, so the post-pay copy stays
// consistent and we don't need to change the Stripe success_url when
// WayStaq's destination URL eventually changes. When
// WAYSTAQ_ASIA_ADVENTURES_URL is set, the "Open on WayStaq" button is
// the primary CTA; when it isn't yet set, the button still works but
// points at waystaq.com so the buyer can find their way in manually.

export const metadata: Metadata = {
  title: 'Thanks, your Asia Adventures access is on its way',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function AsiaAdventuresThanks() {
  const waystaqUrl = process.env.WAYSTAQ_ASIA_ADVENTURES_URL || 'https://waystaq.com'

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment received</h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Thanks for buying access to the Asia Adventures trip. We&apos;ve sent the access request over to WayStaq. Your next step is to head there and sign in with the same email you used at checkout. If you don&apos;t have a WayStaq account yet, sign up free, the trip will be waiting in your account when you arrive.
          </p>
          <a
            href={waystaqUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full justify-center py-2.5"
          >
            Open on WayStaq <ArrowRight className="w-4 h-4" />
          </a>
          <p className="text-xs text-gray-500 mt-4">
            Receipt is in your email. Any problems,{' '}
            <Link href="/work-with-us" className="text-brand-700 font-semibold hover:underline">
              get in touch
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
