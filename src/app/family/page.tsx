import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { ensureProfile } from '@/lib/ensure-profile'
import FamilyPassportSections from '../account/FamilyPassportSections'

export const metadata: Metadata = { title: 'My Family' }
export const dynamic = 'force-dynamic'

// /family is the family dashboard: every family-level section
// (Adventure Passport kid cards, home country, country visits,
// pack allocation, stamp award, delete passport) rendered as a
// dedicated page. /account links here with an "Open my family"
// button; /passports also links here for premium users.

export default async function FamilyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/family')

  await ensureProfile(user)

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, home_country_iso2')
    .eq('id', user.id)
    .maybeSingle()

  // Family management is a premium feature. Non-premium accounts
  // bounce back to /account where the upgrade CTA lives.
  if (!isPremiumTier(profile?.subscription_tier)) redirect('/account')

  const homeIso2 = (profile as { home_country_iso2?: string | null } | null)?.home_country_iso2 ?? null

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to account
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">My Family</h1>
        <p className="text-sm text-gray-500 mb-6">
          Every child&apos;s passport, every visited country, every awarded stamp. Family-wide settings live here too,
          so adding a country lights it up on every child&apos;s map at once.
        </p>

        <FamilyPassportSections homeIso2={homeIso2} />
      </div>
    </div>
  )
}
