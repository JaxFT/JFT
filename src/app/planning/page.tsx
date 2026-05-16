import Link from 'next/link'
import {
  ArrowRight, Check, Wallet, Map, ListChecks, Users2, Globe2,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planning & Tracking',
  description: 'Waystaq — the trip planner and budget tracker we use every day on the road. Built for long-term family travel.',
}

const FEATURES = [
  {
    icon: Map,
    title: 'Multi-country trip planner',
    body: 'Every country, every city, every leg in one timeline. Accommodation, transport, dates — out of the spreadsheet, into one place.',
  },
  {
    icon: Wallet,
    title: 'Real-time expense tracker',
    body: 'Log spend in any local currency and watch it auto-convert to your home currency. Daily averages by category, country, and trip leg.',
  },
  {
    icon: ListChecks,
    title: 'Travel task manager',
    body: 'Visas, vaccinations, insurance, bookings, packing — pinned to the right country and the right week, never forgotten at the wrong border.',
  },
  {
    icon: Users2,
    title: 'Shared with your family',
    body: 'Travelling companions can add stops, log spend, and tick off tasks — all synced instantly. The whole family on the same plan.',
  },
]

const HERO_IMAGE = 'https://waystaq.com/images/jft/jft-family-sahara-dunes-morocco.jpeg'
const SCREEN_PLANNER = 'https://waystaq.com/images/jft/waystaq-app-home-screen-asia-adventure-trip-planner.jpeg'
const SCREEN_BUDGET = 'https://waystaq.com/images/jft/waystaq-daily-spend-by-country-chart-long-term-travel.jpeg'

export default function PlanningPage() {
  return (
    <div className="min-h-screen bg-sand-50">

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={HERO_IMAGE} alt="Family travelling across the Sahara dunes in Morocco" className="w-full h-full object-cover" />
          {/* Solid dark base ensures white text stays readable over the sandy photo */}
          <div className="absolute inset-0 bg-brand-950/75" />
          {/* Gradient on top adds depth without going too transparent at the corners */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-950/40 via-transparent to-brand-700/30" />
        </div>
        <div className="max-w-4xl mx-auto text-center text-white">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-200 mb-4">Planning &amp; Tracking</p>
          <h1 className="font-light leading-[1.05] tracking-tight mb-6" style={{ fontSize: 'clamp(36px, 5.5vw, 60px)' }}>
            Your trip. Every country.<br />
            <span className="font-bold text-brand-200">Every penny.</span>
          </h1>
          <p className="text-lg text-white/80 leading-relaxed max-w-xl mx-auto mb-10">
            Waystaq is the trip planner and budget tracker we use every day on the road. Built by long-term travellers for long-term travellers — designed to replace the spreadsheet.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <a
              href="https://waystaq.com/app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-base px-7 py-3.5"
            >
              Open Waystaq <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://www.waystaq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-white/70 hover:text-white underline underline-offset-4 decoration-white/30"
            >
              Learn more at waystaq.com
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">What's inside</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">Three apps' worth of work, in one place</h2>
            <p className="text-gray-500 mt-3">A planner, a task manager, and a budget tool — synced, multi-currency, and built for trips that span months or years.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-sand-50 rounded-2xl p-6 border border-sand-200">
                <div className="w-11 h-11 bg-brand-600 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCREENSHOTS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">The planner</p>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">See the whole trip at a glance</h3>
            <p className="text-gray-500 leading-relaxed mb-5">
              Country by country, week by week. Adjust as plans change — Waystaq keeps the dates, transport, and accommodation lined up so you always know where you're sleeping next.
            </p>
            <ul className="space-y-2.5 text-sm text-gray-700">
              {[
                'Drag, drop, and reorder legs as plans change',
                'Pin notes, links, and bookings to each stop',
                'Works across 40+ countries today',
              ].map(line => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-brand-800" strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-md bg-white">
            <img src={SCREEN_PLANNER} alt="Waystaq trip planner — Asia adventure home screen" className="w-full h-auto block" />
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-md bg-white order-2 lg:order-1">
            <img src={SCREEN_BUDGET} alt="Waystaq daily spend by country chart" className="w-full h-auto block" />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">The budget</p>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Stop guessing. Start knowing.</h3>
            <p className="text-gray-500 leading-relaxed mb-5">
              Spend tracked in real time, in the right currency, broken down by category and by country. So you know whether you can afford another month in Lisbon before you ask the landlord.
            </p>
            <ul className="space-y-2.5 text-sm text-gray-700">
              {[
                'Log in any local currency — auto-converted to your home currency',
                'Daily averages by country and by category',
                'See the whole trip burn rate, not just yesterday',
              ].map(line => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-brand-800" strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-brand-950 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-4">Ready to try it?</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Free to start. <span className="text-brand-300">£24.99 / year</span> for Premium.
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
            Premium adds trip sharing with travelling companions and the deeper budget views. 14-day refund. Cancel any time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="https://waystaq.com/app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-base px-8 py-3.5"
            >
              Open Waystaq <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://www.waystaq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-white/60 hover:text-white underline underline-offset-4 decoration-white/30"
            >
              See more at waystaq.com
            </a>
          </div>
        </div>
      </section>

      {/* MORE TOOLS PLACEHOLDER */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/60 rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <Globe2 className="w-9 h-9 mx-auto text-gray-300 mb-3" />
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">More planning tools coming</p>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Visa trackers, route optimisers, school-on-the-road planners — all built for families. In the meantime, try our family-readiness assessment.
            </p>
            <Link href="/i-want-to-travel" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 mt-4">
              I Want To Travel <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
