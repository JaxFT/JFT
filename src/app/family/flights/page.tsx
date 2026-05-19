import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plane } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { listFlightsForParent, listChildrenForParent } from '@/lib/passport-db'
import { PACK_META } from '@/lib/adventurePackData'
import FlightLog from './FlightLog'

export const metadata: Metadata = { title: 'Family flights' }
export const dynamic = 'force-dynamic'

export default async function FlightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/family/flights')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()
  if (!isPremiumTier(profile?.subscription_tier)) redirect('/family')

  const [flights, children] = await Promise.all([
    listFlightsForParent(),
    listChildrenForParent(),
  ])

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/family" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Family
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="bg-brand-50 text-brand-700 rounded-xl p-3">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">Family Passport</p>
            <h1 className="text-3xl font-bold text-gray-900">Flight log</h1>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Every flight you log earns a <strong>Brave Traveller</strong> stamp for each child in the family.
          You can backdate flights too — handy for journeys you took before you started using JFT.
        </p>

        <FlightLog
          initialFlights={flights}
          childCount={children.length}
          allPacks={PACK_META.map(p => ({ slug: p.slug, country: p.country, flag: p.flag }))}
        />
      </div>
    </div>
  )
}
