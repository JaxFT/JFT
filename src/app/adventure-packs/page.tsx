import type { Metadata } from 'next'
import Link from 'next/link'
import { Lock, Crown, ArrowRight, Compass } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { PACK_META } from '@/lib/adventurePackData'
import FlagHalfBanner from '@/components/adventure-packs/FlagHalfBanner'

export const metadata: Metadata = {
  title: 'Adventure Packs',
  description: 'Interactive, country-specific missions for worldschooling families. Language, food, geography, history, scavenger hunts and family conversation cards.',
}

export const dynamic = 'force-dynamic'

export default async function AdventurePacksListing() {
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

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 inline-flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" /> Adventure Packs
          </p>
          <h1 className="text-4xl font-bold text-gray-900">Missions for your family on the road</h1>
          <p className="text-gray-500 mt-2 text-lg leading-relaxed">
            Interactive packs for worldschooling families: language, food, geography, history, scavenger hunts and family chat cards. Do them on the ground, in the moment.
          </p>
        </div>

        {!user && (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl px-5 py-4 mb-8 text-sm text-brand-900">
            <strong>Sign in to use Adventure Packs.</strong>{' '}
            <Link href="/login?next=/adventure-packs" className="underline font-semibold">Log in</Link>{' '}
            or{' '}
            <Link href="/signup?next=/adventure-packs" className="underline font-semibold">create a free account</Link>. France is free for every member.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PACK_META.map(p => {
            const isComingSoon = p.status === 'coming-soon'
            const unlocked = p.isFree || isPremium
            const showLock = !p.isFree && !isPremium

            return (
              <article
                key={p.slug}
                className={`rounded-2xl border overflow-hidden bg-white shadow-sm flex flex-col ${
                  isComingSoon ? 'border-gray-200 opacity-90' : 'border-gray-100'
                }`}
              >
                <div className="relative">
                  <FlagHalfBanner iso2={p.iso2} country={p.country} />
                  <span className="absolute top-2 right-2">
                    {p.isFree ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-white text-brand-700 px-2 py-1 rounded-full shadow-sm">
                        Free
                      </span>
                    ) : unlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/15 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                        <Crown className="w-3 h-3" /> Included
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-white/15 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                        <Lock className="w-3 h-3" /> Premium
                      </span>
                    )}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-xs text-gray-500 mb-3">9 missions &middot; Ages 5–11</p>

                  {isComingSoon ? (
                    <p className="text-sm text-gray-400 italic mt-auto">Coming soon</p>
                  ) : !user ? (
                    <Link
                      href={`/login?next=/adventure-packs/${p.slug}`}
                      className="mt-auto btn-primary justify-center !py-2 !px-4 !text-sm"
                    >
                      Sign in to open <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : showLock ? (
                    <Link
                      href="/account"
                      className="mt-auto inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-md"
                    >
                      <Crown className="w-3.5 h-3.5" /> Unlock with Premium
                    </Link>
                  ) : (
                    <Link
                      href={`/adventure-packs/${p.slug}`}
                      className="mt-auto btn-primary justify-center !py-2 !px-4 !text-sm"
                    >
                      Open pack <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
