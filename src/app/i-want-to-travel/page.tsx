import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Compass, ClipboardCheck, Target, Check } from 'lucide-react'
import type { Metadata } from 'next'
import { FAMILY_WAY_HTML } from './family-way'

export const metadata: Metadata = {
  title: 'I Want To Travel',
  description: 'A decision tool that tells you honestly whether long-term family travel is realistic for your family — right now.',
}

export default async function IWantToTravelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    isPremium = profile?.subscription_tier === 'premium'
  }

  // Premium user — embed the Family Way questionnaire (HTML bundled at build time)
  if (isPremium) {
    return (
      <div className="pt-16 bg-sand-50">
        <iframe
          srcDoc={FAMILY_WAY_HTML}
          title="Family Way questionnaire"
          className="w-full border-0 block"
          style={{ height: 'calc(100vh - 4rem)' }}
        />
      </div>
    )
  }

  // Not premium (signed-out OR free tier) — show the marketing page
  const primaryCta = user
    ? { href: '/account', label: 'Upgrade to Premium' }
    : { href: '/signup?next=/i-want-to-travel', label: 'Sign up to get started' }
  const secondaryCta = user
    ? null
    : { href: '/login?next=/i-want-to-travel', label: 'Already a member? Log in' }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* HERO */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-brand-100 -z-10" />
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">Family Travel Assessment</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-gray-900 leading-[1.05] tracking-tight mb-6">
            Could your family <span className="font-bold text-brand-700">actually do this?</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto mb-10">
            Families don't need more travel ideas. They need clarity. <strong>I Want To Travel</strong> helps you understand if long-term travel is realistic — for your family, right now.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <Link href={primaryCta.href} className="btn-primary">
              {primaryCta.label} <ArrowRight className="w-4 h-4" />
            </Link>
            {secondaryCta && (
              <Link href={secondaryCta.href} className="text-sm font-medium text-gray-500 hover:text-gray-800 underline underline-offset-4 decoration-gray-300">
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">A 5-minute assessment, built for honesty</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: ClipboardCheck,
                num: '01',
                title: 'Answer honestly',
                body: 'Questions about your family setup, work situation, routine needs, and travel preferences. No fluff — only what actually predicts whether it will work.',
              },
              {
                icon: Compass,
                num: '02',
                title: 'Get your profile',
                body: 'A readiness score, your specific strengths and challenges, recommended travel style, and ideal regions — based on real long-term-travelling-family experience.',
              },
              {
                icon: Target,
                num: '03',
                title: 'Know your next step',
                body: 'A clear, practical recommendation. Not inspiration — what to actually do next, whether that\'s booking a pilot trip or fixing one specific blocker first.',
              },
            ].map((step) => (
              <div key={step.num} className="bg-sand-50 rounded-2xl p-7 border border-sand-200">
                <div className="w-11 h-11 bg-brand-600 rounded-xl flex items-center justify-center mb-5">
                  <step.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">{step.num}</p>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">Who it's for</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5">For families seriously considering long-term travel</h2>
            <p className="text-gray-600 leading-relaxed">
              You've thought about taking your family on the road — three months, a year, longer. You've read the inspiring blogs. What you don't have is a clear answer to whether <em>your</em> family, with <em>your</em> work, <em>your</em> children, and <em>your</em> tolerance for the unknown, can actually pull it off.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              That's the gap this tool closes.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4">What you'll get</p>
            <ul className="space-y-3">
              {[
                'A personalised readiness score (0–100)',
                'Specific strengths your family already has',
                'Honest challenges — and what to do about them',
                'Recommended travel style and pace for your family',
                'Suggested regions based on your preferences',
                'A clear next step — not a generic "go for it"',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
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

      {/* PRICING / CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-brand-950 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-4">Premium membership</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Included with Premium — <span className="text-brand-300">£25 a year</span>
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
            I Want To Travel is part of the Premium membership, which also includes every guide and every learning pack. Cancel any time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href={primaryCta.href} className="btn-primary text-base px-8 py-3.5">
              {primaryCta.label} <ArrowRight className="w-4 h-4" />
            </Link>
            {secondaryCta && (
              <Link href={secondaryCta.href} className="text-sm font-medium text-white/60 hover:text-white underline underline-offset-4 decoration-white/30">
                {secondaryCta.label}
              </Link>
            )}
          </div>
          <p className="mt-6 text-xs text-white/40">
            {user ? 'Logged in as a free member. Upgrade to unlock.' : 'Sign up is free. Premium upgrade is optional.'}
          </p>
        </div>
      </section>
    </div>
  )
}
