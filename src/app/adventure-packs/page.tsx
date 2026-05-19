import type { Metadata } from 'next'
import { Compass } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { PACK_META } from '@/lib/adventurePackMeta'
import AdventurePackBrowser from './AdventurePackBrowser'
import CountryFlag from '@/components/CountryFlag'

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

  const livePacks   = PACK_META.filter(p => p.status === 'live')
  const upcomingPacks = PACK_META.filter(p => p.status === 'coming-soon')

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
            <a href="/login?next=/adventure-packs" className="underline font-semibold">Log in</a>{' '}
            or{' '}
            <a href="/signup?next=/adventure-packs" className="underline font-semibold">create a free account</a>. France is free for every member.
          </div>
        )}

        <AdventurePackBrowser
          packs={livePacks.map(p => ({
            slug: p.slug,
            country: p.country,
            flag: p.flag,
            iso2: p.iso2,
            isFree: p.isFree,
            continent: p.continent,
          }))}
          isPremium={isPremium}
          signedIn={!!user}
        />

        {upcomingPacks.length > 0 && (
          <section className="mt-14 border-t border-gray-200 pt-8">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">Coming soon</p>
            <p className="text-sm text-gray-500 mb-5 max-w-2xl">
              We&apos;re shipping new country packs every few weeks. Here&apos;s what&apos;s next.
            </p>
            <ul className="flex flex-wrap gap-2">
              {upcomingPacks.map(p => (
                <li
                  key={p.slug}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-600"
                >
                  <CountryFlag iso2={p.iso2} country={p.country} ariaHidden size="sm" />
                  {p.country}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
