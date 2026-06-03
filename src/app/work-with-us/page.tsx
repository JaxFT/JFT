import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, MessageCircle, Calendar, Mail, Compass, Eye } from 'lucide-react'
import BookCallButton from './BookCallButton'
import WaystaqCard from '@/components/WaystaqCard'
import AffiliateLinks from './AffiliateLinks'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'

export const metadata: Metadata = {
  title: 'Work With Us, 1:1 family travel call',
  description: 'Book a one-to-one call with Bec and Oli to talk through your long-term family travel plans.',
}

export const dynamic = 'force-dynamic'

export default async function WorkWithUsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let viewerName: string | null = null
  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, subscription_tier')
      .eq('id', user.id)
      .maybeSingle()
    viewerName = (profile as { full_name?: string | null } | null)?.full_name ?? null
    isPremium = isPremiumTier((profile as { subscription_tier?: string | null } | null)?.subscription_tier)
  }
  const viewerEmail = user?.email ?? null
  return (
    <div className="min-h-screen bg-sand-50">

      {/* HERO — questionnaire is the primary first-touch, framed
          around the visitor's own dream rather than the call funnel.
          The call comes after, as the deeper option for people who
          already know they want to talk it through. */}
      <section className="pt-32 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">How we can help</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-gray-900 leading-[1.05] tracking-tight mb-6">
            Always wanted to <span className="font-bold text-brand-700">take a year out</span> with your family?
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Not sure where to start, or how close you really are right now? Long-term family travel isn&apos;t one decision — it&apos;s a hundred small ones, and most families spend years dreaming before they realise they&apos;re closer than they thought.
          </p>
        </div>
      </section>

      {/* QUESTIONNAIRE CTA — the main "start here" option for most
          first-time visitors. Tinted card, prominent link. */}
      <section className="pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-brand-50 border-2 border-brand-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-5 h-5 text-brand-700" />
              <p className="text-xs font-bold tracking-widest uppercase text-brand-700">Start here · about 5 minutes · free</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
              Take our pre-trip questionnaire
            </h2>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-2 max-w-xl">
              Honest answers to your own questions, in about five minutes. You&apos;ll get a readiness score, your specific strengths and gaps, recommended travel style, and a clear next step you can act on this week.
            </p>
            <p className="text-xs text-gray-500 mb-5 max-w-xl">
              Answer as honestly as you can, you only see the result if it&apos;s honest. Nothing is saved or sent anywhere, your answers live in your browser for the session and disappear when you close the tab.
            </p>
            <Link
              href="/i-want-to-travel"
              className="inline-flex items-center gap-1.5 btn-primary !text-sm"
            >
              Try the questionnaire <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SMALLER WAY IN, the £4.99 trip-view product. Positioned above
          the 1:1 card so visitors see the lower-friction option first;
          the call is still the deeper one if they want to talk through
          their own family rather than read ours. */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-4">
            <div className="flex-1">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 inline-flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> A smaller way in, £4.99
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                Walk through our live two-year Asia trip
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Want a less-talk option? Get view-only access to our family&apos;s live two-year Asia trip on WayStaq, every accommodation, every cost, every day on the road. New stops appear as we keep going. For the price of a coffee.
              </p>
            </div>
            <Link
              href="/asia-adventures"
              className="btn-outline shrink-0"
            >
              See what&apos;s in it <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CALL INTRO, dark card, mirrors the "Book a 1:1" CTA in the
          questionnaire results so anyone arriving from either funnel
          sees the same pitch. */}
      <section className="pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-brand-950 text-white rounded-2xl p-6 sm:p-8">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-3 inline-flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> Or talk it through with us
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
              Book a 1:1 with us, £49.99
            </h2>
            <p className="text-white/80 leading-relaxed text-sm sm:text-base max-w-xl mb-3">
              We&apos;ve done this. We travel full-time as a family and we know what it actually takes, not the highlight reel version, the real one. If you want to talk through your specific situation, work out where the gaps are, and make a plan that fits your family, hit the button below.
            </p>
            <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-5 inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> 60-minute video call · £49.99
            </p>
            <BookCallButton viewerEmail={viewerEmail} viewerName={viewerName} variant="outline-on-dark" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">How the call works</p>
            <ol className="space-y-5">
              {[
                {
                  icon: MessageCircle,
                  title: 'Tell us a bit about you',
                  body: 'Click "Book a 1:1" to open a short form. Where you\'re at, what you\'d like to discuss, and the days and times that work for you. Takes 2 minutes.',
                },
                {
                  icon: Mail,
                  title: 'We reply in your account',
                  body: 'Usually within 48 hours. Replies land in your account thread and your inbox. We propose specific times, agree one, then send a payment link.',
                },
                {
                  icon: Calendar,
                  title: 'We meet on a video call',
                  body: '60 minutes, video call. Your form answers become the agenda, so we use the time on the things that actually matter to your family. You\'ll leave with concrete next steps.',
                },
              ].map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                    <s.icon className="w-5 h-5 text-brand-700" />
                  </div>
                  <div className="pt-1">
                    <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">Step {i + 1}</p>
                    <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* WHAT YOU'LL GET */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">What you'll get out of the call</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Honest take on whether long-term travel is realistic for your family right now',
              'Specific costs for the destinations you\'re considering, not generic averages',
              'Schooling options on the road, what worked and didn\'t for Jax',
              'How we saved and structured the move, practical, not theoretical',
              'Visa, insurance, and logistical questions answered',
              'A clear next step you can act on this week',
            ].map(line => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-200 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-brand-800" strokeWidth={3} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA STRIP — opens the booking modal. Sign-in required, the
          button itself routes to /login when there's no session. */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to talk?</h2>
            <p className="text-sm text-gray-500 mb-3 max-w-md mx-auto">
              Open the form to tell us about your family, what you&apos;d like to discuss, and the days and times that work for you. We&apos;ll reply in your account thread.
            </p>
            <p className="text-xs uppercase tracking-widest font-bold text-brand-700 mb-5 inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> 60-minute video call · £49.99
            </p>
            <BookCallButton viewerEmail={viewerEmail} viewerName={viewerName} label="Book a 1:1 with us" />
            {!viewerEmail && (
              <p className="text-[11px] text-gray-400 mt-3">You&apos;ll need to sign in or create an account so we can reply in your account thread.</p>
            )}
          </div>
        </div>
      </section>

      {/* WAYSTAQ CROSS-PROMO — confident endorsement, not a "if a call
          isn't right" alternative. Three apps in one: trip details,
          expense tracking, and task / admin / logistics manager. */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <WaystaqCard
            title="Waystaq is brilliant — you should use it too"
            body="Three apps in one: a trip planner that lays out every leg of your route, a daily expense tracker that shows where the money's actually going, and a task manager that keeps the admin and logistics from falling through the cracks. We use it every day, on the road and at home planning the next leg."
            ctaLabel="Try Waystaq free"
            userIsPremium={isPremium}
          />
        </div>
      </section>

      {/* COLLAB / UGC CARD — different intent to the consult form,
          so it sits below as its own block with a clear mailto CTA.
          Once the affiliate + UGC programmes are fleshed out properly
          we'll replace the mailto with a dedicated form. */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-brand-950 text-white rounded-2xl p-6 sm:p-8">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-2 inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Brands &amp; creators
            </p>
            <h2 className="text-2xl font-bold mb-2">Collaboration, UGC &amp; affiliate work</h2>
            <p className="text-white/80 leading-relaxed text-sm sm:text-base mb-5 max-w-lg">
              We work with brands that fit how we actually travel — places we&apos;d stay, gear our family really uses,
              learning tools we&apos;d recommend to friends. If that sounds like you, we&apos;d love to hear from you.
            </p>
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <a
                href="mailto:hello@jaxfamilytravels.com?subject=Collaboration%20%2F%20UGC%20enquiry"
                className="inline-flex items-center gap-1.5 bg-white text-gray-900 hover:bg-gray-100 font-bold text-sm px-5 py-2.5 rounded-md"
              >
                <Mail className="w-4 h-4" /> Contact us about a collab
              </a>
              <AffiliateLinks />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
