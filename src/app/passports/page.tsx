import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Crown, QrCode, Stamp, MapPin, BookOpen, Plane, Sparkles, ShieldCheck,
  ArrowRight, Users, Compass, Globe, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { PACK_META } from '@/lib/adventurePackMeta'
import UpgradeButton from '@/components/billing/UpgradeButton'
import PassportPage from '@/components/passport/PassportPage'
import PassportStamp from '@/components/passport/PassportStamp'
import ScatteredStampSheet from '@/components/passport/ScatteredStampSheet'

export const metadata: Metadata = {
  title: 'Adventure Passports',
  description: 'Every child in your family gets their own digital passport. Scan a QR code, unlock countries, collect stamps, and build a memory book of every trip. Free for every child with Premium.',
}

export const dynamic = 'force-dynamic'

export default async function PassportsLanding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()
    isPremium = isPremiumTier(profile?.subscription_tier)
  }

  // Count live country packs once and reuse in both copy spots so a
  // new live pack never leaves the page stating an out-of-date number.
  const livePackCount = PACK_META.filter(p => p.status === 'live').length

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <section className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3 inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Adventure Passports
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
            Every adventure deserves a stamp.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto mb-8">
            Each child in your family gets their own digital passport. They scan a QR code on a parent&apos;s phone,
            do Adventure Pack missions, write tiny journal entries, and watch the world fill up with stamps.
            You stay in control of what they can do.
          </p>
          {isPremium ? (
            <Link href="/family" className="btn-primary text-base px-7 py-3">
              Open my family <ArrowRight className="w-4 h-4" />
            </Link>
          ) : user ? (
            <UpgradeButton className="btn-primary text-base px-7 py-3" label="Get started with Premium" />
          ) : (
            <Link href="/signup?next=/passports" className="btn-primary text-base px-7 py-3">
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <div className="mt-4">
            <Link href="/passports/stamps" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
              <Stamp className="w-4 h-4" /> How stamps work for parents
            </Link>
          </div>
        </section>

        {/* MOCKUP STRIP — visual proof of what it looks like */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* MOCKUP 1: kid landing screen */}
            <div className="bg-gradient-to-br from-brand-700 to-brand-900 rounded-3xl p-6 sm:p-8 text-white shadow-md">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-4">Kid view</p>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 max-w-sm mx-auto">
                <div className="flex items-center gap-3 mb-5">
                  <div className="text-5xl leading-none">🦁</div>
                  <div>
                    <p className="text-xs text-white/60">Welcome back</p>
                    <p className="text-xl font-bold">Eden ✈️</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <p className="text-xs text-white/60">Stamps</p>
                    <p className="font-bold">14</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <p className="text-xs text-white/60">Countries</p>
                    <p className="font-bold">4</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <p className="text-xs text-white/60">Packs</p>
                    <p className="font-bold">3</p>
                  </div>
                </div>
                <p className="text-xs uppercase tracking-widest text-white/60 mb-2">Latest stamps</p>
                <PassportPage className="p-4">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <PassportStamp type="BRAVE_EATER" country="Japan" date="2026-05-14" size="sm" />
                    <PassportStamp type="LOCAL_LINGO" country="Japan" date="2026-05-14" size="sm" />
                    <PassportStamp type="ADVENTURE_PACK_COMPLETE" country="Japan" date="2026-05-15" size="sm" />
                    <PassportStamp type="BRAVE_TRAVELLER" date="2026-05-12" size="sm" />
                  </div>
                </PassportPage>
              </div>
              <p className="text-xs text-white/60 mt-5 text-center">Accessed via QR code, no login needed.</p>
            </div>

            {/* MOCKUP 2: country stamps page (Brazil sample). Same
                ScatteredStampSheet the real kid view uses, so the
                marketing card looks like the actual product. */}
            <div className="bg-gradient-to-br from-brand-700 to-brand-900 rounded-3xl p-6 sm:p-8 text-white shadow-md">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-4">Kid view, Brazil page</p>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 max-w-sm mx-auto">
                <PassportPage className="p-4">
                  <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-dashed" style={{ borderColor: 'rgba(120,80,30,0.3)', color: '#5a3a12' }}>
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em]">🇧🇷 Brazil</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-60">7 stamps</p>
                  </div>
                  <ScatteredStampSheet seed="mockup-brazil" height={300}>
                    <PassportStamp type="MAP_READER"           country="Brazil" date="2026-06-02" size="sm" rotate={0} />
                    <PassportStamp type="LOCAL_LINGO"          country="Brazil" date="2026-06-03" size="sm" rotate={0} />
                    <PassportStamp type="BRAVE_EATER"          country="Brazil" date="2026-06-04" size="sm" rotate={0} />
                    <PassportStamp type="ANIMAL_SPOTTER"       country="Brazil" date="2026-06-05" size="sm" rotate={0} />
                    <PassportStamp type="SCAVENGER_HUNTER"     country="Brazil" date="2026-06-06" size="sm" rotate={0} />
                    <PassportStamp type="STORY_KEEPER"         country="Brazil" date="2026-06-07" size="sm" rotate={0} />
                    <PassportStamp type="ADVENTURE_PACK_COMPLETE" country="Brazil" date="2026-06-09" size="sm" rotate={0} />
                  </ScatteredStampSheet>
                </PassportPage>
              </div>
              <p className="text-xs text-white/60 mt-5 text-center">One page per country. Stamps scatter like a real passport.</p>
            </div>

            {/* MOCKUP 3: parent view */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-6 sm:p-8">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">Parent view</p>
              <div className="space-y-3 max-w-sm mx-auto">
                {[
                  { emoji: '🦁', name: 'Eden', stamps: 14, countries: 4, packs: 3 },
                  { emoji: '🦊', name: 'Otis', stamps: 9, countries: 3, packs: 2 },
                ].map(c => (
                  <div key={c.name} className="bg-sand-50 rounded-2xl p-4 flex items-center gap-3">
                    <div className="text-4xl leading-none">{c.emoji}</div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">Guided mode</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p><span className="font-bold text-gray-900">{c.stamps}</span> stamps</p>
                      <p><span className="font-bold text-gray-900">{c.countries}</span> countries</p>
                    </div>
                  </div>
                ))}
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center text-sm text-gray-400">
                  + Add another child
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-5 text-center">One dashboard for the whole family.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mb-20">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3 text-center">How it works</p>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Three simple steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                n: 1,
                icon: Users,
                title: 'Add your children',
                body: 'Create a profile for each kid: name, avatar, and one of three permission modes (View, Guided, or Creator). Takes 30 seconds.',
              },
              {
                n: 2,
                icon: Compass,
                title: 'Assign Adventure Packs',
                body: 'Pick which country packs each child can use. Different kids can have different packs — useful if they\'re different ages.',
              },
              {
                n: 3,
                icon: QrCode,
                title: 'They scan and explore',
                body: 'Hand the kid a parent\'s phone with their QR code. They land on their own passport, do missions, and earn stamps automatically.',
              },
            ].map(s => (
              <div key={s.n} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-brand-50 text-brand-700 rounded-xl p-2.5">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold tracking-widest uppercase text-gray-400">Step {s.n}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="mb-20">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3 text-center">What&apos;s inside</p>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">A real travel memory book</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Stamp,
                title: '10 stamp types',
                body: 'Brave Eater, Local Lingo, Pack Complete, Brave Traveller and 6 more. Some auto-earn from missions, others are manual.',
              },
              {
                icon: MapPin,
                title: 'World map',
                body: 'Countries light up as kids complete Adventure Packs. Each country gets its own passport page with first-visit date and stamps.',
              },
              {
                icon: BookOpen,
                title: 'Travel journal',
                body: 'Prompted questions in Guided mode ("Best thing you saw?"), free-text editor in Creator mode. Parents can review or edit.',
              },
              {
                icon: Plane,
                title: 'Flight log',
                body: 'Add every flight and watch the Brave Traveller stamps roll in. Notes optional. Family-wide so you only log once.',
              },
              {
                icon: ShieldCheck,
                title: 'Three permission modes',
                body: 'View only for toddlers, Guided for most kids, Creator for older kids. You decide what they can do on their own.',
              },
              {
                icon: Sparkles,
                title: 'Built for memory',
                body: 'No 30-day expiry on passport data. Everything kids write and earn is preserved — a real keepsake from the road.',
              },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="bg-brand-50 text-brand-700 rounded-xl p-2.5 inline-flex mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SAFETY CALLOUT */}
        <section className="mb-20">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="bg-brand-50 text-brand-700 rounded-xl p-3 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Safe for kids</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No child accounts, no logins, no advertising.</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Kids access their passport through a private QR code that you generate. They don&apos;t need an
                  email address or a password. You can revoke and regenerate the code any time. The kid view has
                  no admin controls and no way out into the wider site — they stay inside their own passport.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING / CTA */}
        <section className="text-center max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-brand-800 to-brand-950 rounded-3xl p-8 sm:p-10 text-white shadow-md">
            <Crown className="w-6 h-6 text-brand-300 mx-auto mb-4" />
            <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Free for every child you add.
            </h2>
            <p className="text-white/70 text-base leading-relaxed mb-6 max-w-md mx-auto">
              Included with Premium membership. £49.99 a year covers the whole family — every child, every Adventure Pack,
              every guide, every premium blog post.
            </p>
            <ul className="text-sm text-white/80 inline-flex flex-col gap-2 mb-7 text-left">
              <li className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-brand-300 shrink-0" /> Unlimited children per family</li>
              <li className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-brand-300 shrink-0" /> All {livePackCount} Adventure Packs included</li>
              <li className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-brand-300 shrink-0" /> All future country packs as we ship them</li>
              <li className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-brand-300 shrink-0" /> Cancel any time</li>
            </ul>
            <div className="flex flex-col items-center gap-3">
              {isPremium ? (
                <Link href="/family" className="btn-primary text-base px-8 py-3.5">
                  Open my family <ArrowRight className="w-4 h-4" />
                </Link>
              ) : user ? (
                <UpgradeButton className="btn-primary text-base px-8 py-3.5" label="Upgrade to Premium" />
              ) : (
                <Link href="/signup?next=/passports" className="btn-primary text-base px-8 py-3.5">
                  Sign up free <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {!user && (
                <p className="text-xs text-white/50">Free to join. Upgrade to Premium when you&apos;re ready.</p>
              )}
            </div>
          </div>
        </section>

        {/* SECONDARY LINK to adventure packs */}
        <section className="mt-14 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Adventure Packs are the missions that drive the passport.
          </p>
          <Link href="/adventure-packs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
            <Globe className="w-4 h-4" /> Browse all {livePackCount} Adventure Packs <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

      </div>
    </div>
  )
}
