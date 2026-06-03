import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, MapPin, Receipt, Calendar, ArrowRight, Compass, Mountain } from 'lucide-react'
import BuyTripViewButton from './BuyTripViewButton'

// Landing page for the "Our Total Spending and Trip plan" product: £4.99
// view-only access to JFT's ongoing two-year Asia trip on WayStaq.
// WayStaq's webhook listener grants access; this page is the sales
// surface on the JFT side.

export const metadata: Metadata = {
  title: 'Our Total Spending and Trip plan, a live two-year Asia trip on WayStaq',
  description: 'A live view of our family\'s actual two-year Asia trip on WayStaq. Every accommodation, every transport leg, every cost, every day on the road, updated as we keep going. £4.99 for view-only access.',
}

export const dynamic = 'force-dynamic'

export default function AsiaAdventuresLanding() {
  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="text-center mb-10">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">
            <Compass className="w-3.5 h-3.5" /> Our Total Spending and Trip plan
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3">
            Two years across Asia, opened up for you
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto leading-relaxed">
            We&apos;ve been on the road since September 2025. Morocco, Thailand, Sri Lanka, the Maldives, India, Nepal and Malaysia so far, with more to come. Every accommodation we&apos;ve booked, every transport leg, every cost, every day on the road, opened up for you to look at on WayStaq. A live view that updates as we keep going.
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
                A live view of the whole trip and the real numbers.
              </h2>
              <p className="text-white/80 leading-relaxed text-sm sm:text-base mb-5">
                We use WayStaq to plan and track our family&apos;s travel. £4.99 gives you view-only access to the whole Asia trip: the route, the bookings we made, the transport, and what each leg cost us. This is the live trip plan, not a finished retrospective, so you&apos;ll see new stops, new bookings and new costs appear as we keep going. After you pay, you can sign up for a free WayStaq account (or sign in to an existing one) with the same email and you&apos;re in.
              </p>
              <BuyTripViewButton className="btn-primary bg-white !text-brand-700 hover:bg-white/90" />
              <p className="text-white/60 text-xs mt-3">
                One-time payment. View access doesn&apos;t expire and updates as the trip continues.
              </p>
            </div>
          </div>
        </div>

        {/* AT A GLANCE. Total spent is deliberately kept off the public
            page so the day-rate stays inside the paid product. */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">At a glance</p>
          <dl className="grid grid-cols-3 gap-4">
            <Stat label="Trip length" value="2 years" />
            <Stat label="Started" value="Sep 2025" />
            <Stat label="Countries so far" value="7" />
          </dl>
          <p className="text-xs text-gray-400 mt-4 italic">
            The total spend, per-night rates, per-country and per-day numbers, plus what each leg cost individually, are all inside.
          </p>
        </section>

        {/* A PEEK INSIDE, redacted WayStaq screenshots so buyers see the
            structure of what they're getting without the specifics. The
            three images are portrait-oriented, so the layout constrains
            the main one and pairs the other two side-by-side. */}
        <section className="mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4 text-center">A peek inside (everything specific is blurred here)</p>
          <div className="space-y-4">
            <figure className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mx-auto max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/asia-adventures/trip-landing.jpeg"
                alt="The trip overview in WayStaq, showing the route and stops across Asia, with specifics blurred"
                className="w-full block"
                loading="lazy"
              />
              <figcaption className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100 text-center">
                The trip overview, every leg in one place.
              </figcaption>
            </figure>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <figure className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/asia-adventures/open-stop.jpeg"
                  alt="One stop in WayStaq opened up, with accommodation, transport and cost fields visible but blurred"
                  className="w-full block"
                  loading="lazy"
                />
                <figcaption className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100 text-center">
                  One stop opened up. The fields are recorded for every leg.
                </figcaption>
              </figure>
              <figure className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/asia-adventures/spend-breakdown.jpeg"
                  alt="WayStaq spending breakdown by category, with the £ amounts blurred"
                  className="w-full block"
                  loading="lazy"
                />
                <figcaption className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100 text-center">
                  Spending broken down. The £ amounts live inside.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">What you&apos;ll see</p>
          <ul className="space-y-3 text-sm text-gray-700">
            {[
              {
                icon: MapPin,
                title: 'The full route, day by day',
                body: 'Every country, every city, every move so far, with the dates we were there and how long we stayed in each spot. Plus what we&apos;ve got planned for the next leg.',
              },
              {
                icon: Receipt,
                title: 'Every cost, in real numbers',
                body: 'Accommodation, transport, food, activities, kid-specific extras. The actual amounts, not estimates. You can see what each leg cost and total it however you want.',
              },
              {
                icon: Calendar,
                title: 'Live updates as we keep going',
                body: 'This isn&apos;t a finished retrospective. We add new stops, new bookings and new costs as the trip continues, so the view you buy today keeps growing for as long as we&apos;re on the road.',
              },
            ].map(s => (
              <li key={s.title} className="flex gap-3">
                <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-brand-700" />
                </div>
                <div className="pt-1">
                  <p className="font-semibold text-gray-900 mb-0.5">{s.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: s.body }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* HONEST HIGHLIGHTS, our take on the trip so far. Reframed so
            none of it implies the buyer will see this commentary inside
            WayStaq, the trip view they get is the factual record, not
            our retrospective. The commentary lives here on the landing. */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">Honest highlights, from us</p>
          <ul className="space-y-4 text-sm text-gray-700">
            <li className="flex gap-3">
              <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                <Mountain className="w-4 h-4 text-brand-700" />
              </div>
              <div className="pt-1">
                <p className="font-semibold text-gray-900 mb-0.5">The standout so far: the intro Annapurna trek from Pokhara</p>
                <p className="leading-relaxed">Probably our best day or two of the whole trip up to now. The cost, the booking and the route are all inside the trip view.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4 text-amber-700" />
              </div>
              <div className="pt-1">
                <p className="font-semibold text-gray-900 mb-0.5">Where we&apos;d cut: Fez, Morocco</p>
                <p className="leading-relaxed">Worth a look once, but for us probably a souk too many. It didn&apos;t feel different enough from other places we&apos;d already been. That&apos;s our take; the trip view itself just shows what we booked, when, and what it cost.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 text-brand-700" />
              </div>
              <div className="pt-1">
                <p className="font-semibold text-gray-900 mb-0.5">The number that surprised us most</p>
                <p className="leading-relaxed">What we paid per night for accommodation in Malaysia. We&apos;d quietly assumed it would be one thing, it ended up being another. The actual figure is inside the plan.</p>
              </div>
            </li>
          </ul>
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
                title: 'The trip is in your account',
                body: 'View-only, but otherwise the full thing. You can read every detail, copy ideas into your own plans, and come back to it whenever. As we keep going, new entries appear in your view.',
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

        {/* HONEST CAVEATS */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">Worth knowing before you buy</p>
          <ul className="space-y-2.5 text-sm text-gray-700">
            <li className="flex gap-2.5"><Check className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" /> It&apos;s a real trip we&apos;re still on, not a finished generic itinerary. Some of it will fit your family, some of it won&apos;t.</li>
            <li className="flex gap-2.5"><Check className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" /> The costs are what we paid, in the months we paid them. Prices have moved since.</li>
            <li className="flex gap-2.5"><Check className="w-4 h-4 text-brand-700 mt-0.5 shrink-0" /> You&apos;re viewing it inside WayStaq, our planning tool, so the UI is theirs. A free WayStaq account is required to read it.</li>
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
