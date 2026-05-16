import Link from 'next/link'
import { ArrowRight, Check, Wallet, BarChart3, Globe2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planning & Tracking',
  description: 'Tools we built for families planning long-term travel — starting with the budget tracker we use every day on the road.',
}

export default function PlanningPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      {/* HERO */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">Planning &amp; Tracking</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-gray-900 leading-[1.05] tracking-tight mb-6">
            Tools we built for <span className="font-bold text-brand-700">families on the road</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            We needed a way to actually see what travel was costing us — not at the end of the month, but right now, in the right currency, across the whole family. So we built one.
          </p>
        </div>
      </section>

      {/* WAYSTAQ FEATURE */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">

              {/* Left: pitch */}
              <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-bold tracking-widest uppercase text-brand-600">Our budget tracker</p>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">Waystaq</h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  The travel budget tracker we use every day. Built specifically for the way families on the road actually spend — multi-currency, per-leg breakdowns, and a real-time picture of how the trip is tracking against plan.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    'Log expenses in any currency — auto-converted to your home currency',
                    'See spend by category, country, or trip leg at a glance',
                    'Know if you can afford to stay another week before you book the flight',
                    'Designed for families, not solo backpackers',
                  ].map(line => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-200 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-brand-800" strokeWidth={3} />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>

                <a
                  href="https://www.waystaq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary self-start"
                >
                  Try Waystaq <ArrowRight className="w-4 h-4" />
                </a>
                <p className="text-xs text-gray-400 mt-3">Opens at waystaq.com</p>
              </div>

              {/* Right: visual placeholder */}
              <div className="bg-gradient-to-br from-brand-50 via-brand-100 to-brand-200 p-8 sm:p-10 lg:p-12 flex items-center justify-center min-h-[320px]">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-5 bg-white/80 rounded-2xl flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-10 h-10 text-brand-700" />
                  </div>
                  <p className="text-sm font-semibold tracking-widest uppercase text-brand-800/70">Waystaq</p>
                  <p className="text-xs text-brand-800/50 mt-2">Family travel budgeting, done properly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MORE TOOLS PLACEHOLDER */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/60 rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <Globe2 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">More tools coming</p>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Itinerary planners, visa trackers, and route optimisers — all in the same place, all built for families.
            </p>
            <Link href="/i-want-to-travel" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 mt-4">
              Try our family-readiness assessment <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
