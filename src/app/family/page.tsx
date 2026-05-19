import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Crown, Users, ArrowRight, Plus, Stamp, MapPin, Trophy, Plane } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { listChildrenForParent, getStatsForChildren } from '@/lib/passport-db'
import { PERMISSION_LABELS } from '@/lib/passport-types'
import AddChildForm from './AddChildForm'
import UpgradeButton from '@/components/billing/UpgradeButton'

export const metadata: Metadata = { title: 'Family' }
export const dynamic = 'force-dynamic'

export default async function FamilyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/family')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()
  const isPremium = isPremiumTier(profile?.subscription_tier)

  // Free users see a locked landing instead of the dashboard. The
  // upgrade button starts the same Stripe Checkout we built earlier.
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-sand-50 pt-24 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Family Passport
          </p>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Build your family&apos;s travel story</h1>
          <p className="text-gray-500 text-lg leading-relaxed mb-8">
            Give every child their own passport, scan in via QR, collect stamps as you go, and watch the world unlock.
            Included with Premium.
          </p>
          <div className="bg-brand-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-4">
            <Crown className="w-6 h-6 text-brand-300" />
            <p className="text-xl font-bold">Premium, £49.99 a year</p>
            <p className="text-white/70 text-sm max-w-md">
              Includes the Family Passport, all 17 Adventure Packs, every premium guide, and every premium blog post.
            </p>
            <UpgradeButton className="btn-primary text-base px-7 py-3 mt-2" />
          </div>
        </div>
      </div>
    )
  }

  const children = await listChildrenForParent()
  const stats = await getStatsForChildren(children.map(c => c.id))

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Family Passport
          </p>
          <h1 className="text-4xl font-bold text-gray-900">Your family</h1>
          <p className="text-gray-500 mt-2 text-lg leading-relaxed">
            Each child gets their own passport, accessed by scanning a QR code. Add them here, assign Adventure Packs,
            and configure how much they can do on their own.
          </p>
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="text-5xl mb-3">🧒</div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Add your first child</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              You can add one for each kid in the family. They&apos;ll each get their own QR code, their own passport,
              and their own stamps.
            </p>
            <AddChildForm />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {children.map(c => {
                const s = stats[c.id] ?? { stampCount: 0, countriesUnlocked: 0, packsCompleted: 0 }
                return (
                  <Link
                    key={c.id}
                    href={`/family/${c.id}`}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-brand-200 hover:shadow transition-all flex flex-col"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="text-4xl leading-none">{c.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{c.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{PERMISSION_LABELS[c.permission_mode]}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-auto text-center">
                      <div className="bg-gray-50 rounded-lg py-2">
                        <p className="text-xs text-gray-500 inline-flex items-center gap-1 justify-center">
                          <Stamp className="w-3 h-3" /> Stamps
                        </p>
                        <p className="font-bold text-gray-900">{s.stampCount}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg py-2">
                        <p className="text-xs text-gray-500 inline-flex items-center gap-1 justify-center">
                          <MapPin className="w-3 h-3" /> Countries
                        </p>
                        <p className="font-bold text-gray-900">{s.countriesUnlocked}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg py-2">
                        <p className="text-xs text-gray-500 inline-flex items-center gap-1 justify-center">
                          <Trophy className="w-3 h-3" /> Packs
                        </p>
                        <p className="font-bold text-gray-900">{s.packsCompleted}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <details className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 group">
              <summary className="cursor-pointer inline-flex items-center gap-2 font-semibold text-gray-900">
                <Plus className="w-4 h-4 text-brand-600" /> Add another child
              </summary>
              <div className="mt-5 pt-5 border-t border-gray-100">
                <AddChildForm />
              </div>
            </details>

            {/* Flight log — family-wide, every flight earns Brave Traveller for every child */}
            <Link
              href="/family/flights"
              className="mt-4 block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-brand-200 hover:shadow transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-brand-50 text-brand-700 rounded-xl p-2.5">
                  <Plane className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Family flights</p>
                  <p className="text-sm text-gray-500">Log every flight you take. Each one earns a Brave Traveller stamp for every child.</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
