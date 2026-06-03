import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, MapPin, Receipt, Calendar, ArrowRight, Compass } from 'lucide-react'
import BuyTripViewButton from './BuyTripViewButton'

// Landing page for the Asia Adventures trip-view product. £4.99 buys
// view-only access to the actual JFT trip on WayStaq. WayStaq's webhook
// listener grants access; this page is the sales surface on the JFT side.
//
// Copy spots marked with [TRIP-FACTS] need Bec / Oli to drop the real
// numbers in. Everything else is the steady-state JFT voice for the
// product, light and specific, no hype.

export const metadata: Metadata = {
  title: 'Asia Adventures, our actual trip on WayStaq',
  description: 'Walk through our family\'s real trip across Asia on WayStaq. Every accommodation, every transport leg, every cost, every decision we made. £4.99 for view-only access.',
}

export const dynamic = 'force-dynamic'

export default function AsiaAdventuresLanding() {
  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="text-center mb-10">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">
            <Compass className="w-3.5 h-3.5" /> Asia Adventures
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3">
            Walk through our actual Asia trip
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto leading-relaxed">
            {/* [TRIP-FACTS] one-line summary, e.g. "Three months across Vietnam, Cambodia, Thailand, Japan and Indonesia." */}
            Three months across Asia, every accommodation we booked, every transport leg, every cost, and the decisions we made along the way, opened up for you to look at on WayStaq.
          </p>
        </div>

        {/* HERO CARD with the buy CTA */}
        <div className="bg-brand-950 text-white rounded-2xl p-6 sm:p-8 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6 gap-4">
            <div className="flex-1">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-3">
                View-only access · one-off purchase
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
                The whole trip, opened up for you to read.
              </h2>
              <p className="text-white/80 leading-relaxed text-sm sm:text-base mb-5">
                We use WayStaq to plan and track every trip we take as a family. For £4.99 you get view-only access to the full Asia Adventures trip plan, the real one, not a cleaned-up version. After you pay, you can sign up for a free WayStaq account (or sign in to your existing one) with the same email and you&apos;re in.
              </p>
              <BuyTripViewButton className="btn-primary bg-white !text-brand-700 hover:bg-white/90" />
              <p className="text-white/60 text-xs mt-3">
                One-time payment. View access doesn&apos;t expire.
              </p>
            </div>
          </div>
        </div>

        {/* WHAT YOU GET */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">What you&apos;ll see</p>
          <ul className="space-y-3 text-sm text-gray-700">
            {[
              {
                icon: MapPin,
                title: 'The full route, day by day',
                body: 'Every country, every city, every move, with the dates we were there and how long we stayed in each spot.',
              },
              {
                icon: Receipt,
                title: 'Every cost, in real numbers',
                body: 'Accommodation, transport, food, activities, kid-specific extras. The actual amounts, not estimates. You can see what each leg cost and total it however you want.',
              },
              {
                icon: Calendar,
                title: 'The decisions, including the ones we\'d undo',
                body: 'Where we wished we\'d stayed longer, where two nights was plenty, where the budget guesthouse beat the nicer place, and the bookings we made early that we\'d skip next time.',
              },
            ].map(s => (
              <li key={s.title} className="flex gap-3">
                <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-brand-700" />
                </div>
                <div className="pt-1">
                  <p className="font-semibold text-gray-900 mb-0.5">{s.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* TRIP HIGHLIGHTS (placeholder facts) */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">At a glance</p>
          {/* [TRIP-FACTS] replace these with the real numbers from the trip */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Duration" value="3 months" />
            <Stat label="Countries" value="5" />
            <Stat label="Total cost" value="£TBC" />
            <Stat label="Cost per day" value="£TBC" />
          </dl>
          <p className="text-xs text-gray-400 mt-4 italic">
            (Final numbers visible inside the trip on WayStaq.)
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">How it works</p>
          <ol className="space-y-5">
            {[
              {
                title: 'Pay £4.99',
                body: 'One-off Stripe checkout. Card details handled by Stripe, never touched by us.',
              },
              {
                title: 'Sign up on WayStaq with the same email',
                body: 'After payment we send you over to WayStaq. If you already have an account, just sign in. If not, the sign-up is free and takes a minute.',
              },
              {
                title: 'The Asia Adventures trip is in your account',
                body: 'View-only, but otherwise the full thing. You can read every detail, copy ideas into your own plans, and come back to it whenever.',
              },
            ].map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <div className="w-9 h-9 bg-brand-600 text-white rounded-lg flex items-center justify-center shrink-0 font-bold text-sm">
                  {i + 1}
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* HONEST CAVEATS (very JFT voice) */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">Worth knowing before you buy</p>
          <ul className="space-y-2.5 text-sm text-gray-700">
            <li className="flex gap-2.5"><Check className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" /> It&apos;s a real trip we did, not a generic itinerary. So some of it will fit your family, some of it won&apos;t.</li>
            <li className="flex gap-2.5"><Check className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" /> The costs are what we paid, in the months we paid them. Prices have moved since.</li>
            <li className="flex gap-2.5"><Check className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" /> You&apos;re viewing it inside WayStaq, our planning tool, so the UI is theirs. A free account is required to read it.</li>
            <li className="flex gap-2.5"><Check className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" /> View-only means you can read everything but can&apos;t edit our copy. That&apos;s the point, you can fork ideas into your own trip in your own WayStaq account.</li>
          </ul>
        </section>

        {/* FINAL CTA */}
        <div className="text-center">
          <BuyTripViewButton className="btn-primary text-base px-7 py-3" />
          <p className="text-xs text-gray-500 mt-3">
            Got a question first?{' '}
            <Link href="/work-with-us" className="text-brand-700 font-semibold hover:underline">
              Send us a note <ArrowRight className="w-3 h-3 inline -mt-0.5" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
