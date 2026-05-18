import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import Link from 'next/link'
import { BookOpen, Lock, ArrowRight, ExternalLink, GraduationCap, Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Learning Resources',
  description: 'Learning resources for families travelling long-term — sites we use and trust.',
}

export const dynamic = 'force-dynamic'

type RecommendedSite = {
  name: string
  url: string
  eyebrow: string
  blurb: string
  cta: string
  icon: typeof GraduationCap
  image?: string
}

const RECOMMENDED: RecommendedSite[] = [
  {
    name: 'Doodle Learning',
    url: 'https://doodlelearning.com',
    eyebrow: 'Maths & English app',
    blurb: 'Adaptive maths and English for kids 4–14, on phone or tablet. Used in UK schools and brilliant on the road — short daily sessions, works offline, and the levelling keeps it appropriate without a parent hovering.',
    cta: 'Visit Doodle Learning',
    icon: GraduationCap,
    image: '/images/learning/doodle-learning.png',
  },
  {
    name: 'Future Explorers Club',
    url: 'https://futureexplorersclub.com?sca_ref=8670249.cDmoZ599P3lpdNMI',
    eyebrow: 'Monthly travel letters by post',
    blurb: 'No screens, just the simple joy of having something special delivered by Snail Mail!\n\nA monthly travel subscription letter for children to ignite your child\'s passion to learn about our beautiful world, letter by letter, each packed with exciting adventures from new destinations and fun family activities.\n\nYou can choose monthly, 3 month, 6 month or 12 month subscriptions.',
    cta: 'Visit Future Explorers Club',
    icon: GraduationCap,
    image: '/images/learning/future-explorers-club.png',
  },
  {
    name: 'Tuition-Up',
    url: 'https://tuition-up.com',
    eyebrow: 'Online tutoring',
    blurb: 'Live, one-to-one online tuition that works around your family\'s schedule — handy whether you\'re full worldschooling, supplementing local school, or keeping skills sharp during a gap.',
    cta: 'Visit Tuition-Up',
    icon: GraduationCap,
    image: '/images/learning/tuition-up.png',
  },
  {
    name: 'Worldschooling Club',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSfdrRajDbHY1migV1-kfe0BXj81s4101Yp3u6IwHun2zmv_AA/viewform',
    eyebrow: 'Community (from @thebackpackingfamily)',
    blurb: 'A community of families travelling and worldschooling together — meet-ups, advice, and shared experience. Apply via the form to join.',
    cta: 'Apply to join',
    icon: Users,
    image: '/images/learning/Worldschooling-club.png',
  },
]

export default async function LearningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    isPremium = isPremiumTier(profile?.subscription_tier)
  }

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Learning Resources</p>
          <h1 className="text-4xl font-bold text-gray-900">Resources for families on the road</h1>
          <p className="text-gray-500 mt-2 text-lg">Sites we actually use and trust for families on the road.</p>
        </div>

        {/* ADVENTURE PACKS PROMO */}
        <section className="mb-16">
          <Link
            href="/adventure-packs"
            className="block bg-gradient-to-br from-brand-700 to-brand-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-2">Adventure Packs</p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Country-specific missions for your family</h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-2xl">
              Interactive packs covering language, food, geography, history, scavenger hunts and family chat cards — to do on the ground as you travel.
              France is free for every member. <span className="text-white font-semibold">Browse all packs <ArrowRight className="w-4 h-4 inline -mt-0.5" /></span>
            </p>
          </Link>
        </section>

        {/* RECOMMENDED SITES (public) */}
        <section className="mb-16">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-5">Recommended sites</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {RECOMMENDED.map(item => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all overflow-hidden flex flex-col"
              >
                {/* Top: image if provided, else gradient + icon */}
                <div className="aspect-[4/3] bg-gradient-to-br from-brand-100 via-brand-50 to-brand-200 relative overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <item.icon className="w-14 h-14 text-brand-700" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">{item.eyebrow}</p>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h2>
                  <div className="text-sm text-gray-500 leading-relaxed flex-1 space-y-2">
                    {item.blurb.split('\n\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all mt-5">
                    {item.cta} <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            We only recommend services we use ourselves. Some links may be affiliate or referral links — they never change what we recommend.
          </p>
        </section>

        {/* (Premium Learning Packs section removed — superseded by Adventure Packs,
            which have their own top-level page and promo card above.) */}
      </div>
    </div>
  )
}
