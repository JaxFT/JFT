import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, MessageCircle, Calendar, Mail, Compass } from 'lucide-react'
import CallRequestForm from './CallRequestForm'

export const metadata: Metadata = {
  title: 'Work With Us, 1:1 family travel call',
  description: 'Book a one-to-one call with Bec and Oli to talk through your long-term family travel plans.',
}

export default function WorkWithUsPage() {
  return (
    <div className="min-h-screen bg-sand-50">

      {/* HERO */}
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">Work with us</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-gray-900 leading-[1.05] tracking-tight mb-6">
            Talk it through with us, <span className="font-bold text-brand-700">one-to-one</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Sometimes the most useful thing is a real conversation with someone who's actually done it. Book a 1:1 call with Bec and Oli to talk through your family's plans, costs, timing, and the bits you can't find in a guide.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">How it works</p>
            <ol className="space-y-5">
              {[
                {
                  icon: MessageCircle,
                  title: 'Tell us a bit about you',
                  body: 'Fill in the short form below, where you\'re at, what you\'d like to discuss, when works for you. Takes 2 minutes.',
                },
                {
                  icon: Mail,
                  title: 'We email you back',
                  body: 'Usually within 48 hours. We send a payment link and a few proposed times. You pick one and pay.',
                },
                {
                  icon: Calendar,
                  title: 'We meet on a video call',
                  body: '60 minutes, video call. No fixed agenda, we follow your questions. You\'ll leave with concrete next steps for your family.',
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
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">What you'll get out of it</p>
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

      {/* QUESTIONNAIRE NUDGE */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 sm:p-6 flex items-start gap-4 flex-wrap">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-brand-700" />
            </div>
            <div className="flex-1 min-w-[14rem]">
              <p className="text-sm font-semibold text-brand-900 mb-1">Have you completed the I Want To Travel questionnaire?</p>
              <p className="text-sm text-brand-900/80 leading-relaxed">
                We recommend doing it first, it takes 5 minutes and gives us (and you) a clearer picture going into the call, so we can spend the time on what matters. Totally optional though, you can skip straight to booking below.
              </p>
            </div>
            <Link
              href="/i-want-to-travel"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-white hover:bg-brand-100 border border-brand-200 px-4 py-2.5 rounded-md shrink-0 w-full sm:w-auto justify-center"
            >
              Take the questionnaire <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Tell us about you</h2>
            <p className="text-sm text-gray-500 mb-6">No commitment yet, we'll reply with availability and pricing.</p>
            <CallRequestForm />
          </div>
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
            <a
              href="mailto:hello@jaxfamilytravels.com?subject=Collaboration%20%2F%20UGC%20enquiry"
              className="inline-flex items-center gap-1.5 bg-white text-gray-900 hover:bg-gray-100 font-bold text-sm px-5 py-2.5 rounded-md"
            >
              <Mail className="w-4 h-4" /> Contact us about a collab
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
