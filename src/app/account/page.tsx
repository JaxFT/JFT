import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Crown, ShoppingBag, ArrowRight, Calendar, ShieldCheck, FileText, Mail } from 'lucide-react'
import type { Metadata } from 'next'
import SignOutButton from './SignOutButton'
import AccountEditor from './AccountEditor'
import PremiumCancelButton from './PremiumCancelButton'
import ResumeMembershipButton from './ResumeMembershipButton'
import UpgradeButton from '@/components/billing/UpgradeButton'
import ManageBillingButton from '@/components/billing/ManageBillingButton'
import { isPremiumTier } from '@/lib/profile'
import { ensureProfile } from '@/lib/ensure-profile'

export const metadata: Metadata = { title: 'Account' }

type PurchaseRow = {
  id: string
  purchased_at: string
  amount_pence: number
  products: { name: string; slug: string; type: string } | null
}

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/account')

  // Guarantee a profile row exists before we read from it. Handles the
  // edge case where the auth.users → profiles trigger never fired so
  // every UPDATE silently no-ops and the user thinks the form is broken.
  await ensureProfile(user)

  // Profile + purchases are independent, fetch in parallel.
  const [{ data: profile }, { data: purchasesData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, subscription_tier, created_at, marketing_opt_in, cancellation_requested_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('purchases')
      .select('id, purchased_at, amount_pence, products(name, slug, type)')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false }),
  ])

  const purchases = (purchasesData ?? []) as unknown as PurchaseRow[]
  const isPremium = isPremiumTier(profile?.subscription_tier)
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'recently'

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Your account</p>
            <h1 className="text-4xl font-bold text-gray-900">{profile?.full_name || 'Hello'}</h1>
            <p className="text-sm text-gray-500 mt-2 inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Member since {memberSince}
            </p>
          </div>
          <SignOutButton />
        </div>

        {/* Editable profile + password */}
        <div className="mb-6">
          <AccountEditor
            initialFullName={profile?.full_name ?? ''}
            email={user.email ?? ''}
            initialMarketingOptIn={!!profile?.marketing_opt_in}
          />
        </div>

        {/* Subscription */}
        <div className={`rounded-2xl p-6 mb-6 ${isPremium ? 'bg-brand-950 text-white' : 'bg-white border border-gray-100 shadow-sm'}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className={`w-5 h-5 ${isPremium ? 'text-brand-300' : 'text-gray-400'}`} />
                <span className={`text-xs font-bold tracking-widest uppercase ${isPremium ? 'text-brand-300' : 'text-gray-500'}`}>
                  {isPremium ? 'Premium member' : 'Free account'}
                </span>
              </div>
              <h2 className={`text-2xl font-bold ${isPremium ? 'text-white' : 'text-gray-900'}`}>
                {isPremium ? 'You have full access' : 'Upgrade to Premium'}
              </h2>
              <p className={`mt-2 text-sm leading-relaxed max-w-md ${isPremium ? 'text-white/70' : 'text-gray-500'}`}>
                {isPremium
                  ? 'Every premium blog post, every guide, and every adventure pack are included.'
                  : 'A year of access to every premium blog post, every guide, and every adventure pack, £49.99/year.'}
              </p>
              {isPremium && profile?.cancellation_requested_at && (
                <p className="mt-3 text-xs text-amber-200 bg-amber-950/30 border border-amber-700/40 rounded-md px-3 py-2 inline-block">
                  Cancellation requested on {new Date(profile.cancellation_requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  Your access continues to the end of your current paid period.
                </p>
              )}
            </div>
            {!isPremium && (
              <div className="shrink-0">
                <UpgradeButton className="btn-primary !py-2.5 !px-5 !text-sm" />
              </div>
            )}
            {isPremium && (
              <div className="shrink-0 flex flex-col items-end gap-2">
                <ManageBillingButton />
                {profile?.cancellation_requested_at
                  ? <ResumeMembershipButton />
                  : <PremiumCancelButton />}
              </div>
            )}
          </div>
        </div>

        {/* Purchases */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">Your purchases</h2>
          </div>

          {purchases.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm mb-5">You haven't bought anything yet.</p>
              <Link href="/guides" className="btn-outline !py-2 !px-4 !text-sm">
                Browse guides <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {purchases.map(p => (
                <li key={p.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{p.products?.name ?? 'Unknown item'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(p.purchased_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {p.products?.type && <> · {p.products.type}</>}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 shrink-0">
                    £{(p.amount_pence / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Help & legal */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
          <h2 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-4">Help &amp; legal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              href="/privacy"
              target="_blank"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-700 hover:bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200"
            >
              <ShieldCheck className="w-4 h-4 text-gray-400" /> Privacy policy
            </Link>
            <Link
              href="/terms"
              target="_blank"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-700 hover:bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200"
            >
              <FileText className="w-4 h-4 text-gray-400" /> Terms of service
            </Link>
            <a
              href="mailto:hello@jaxfamilytravels.com"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-700 hover:bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200"
            >
              <Mail className="w-4 h-4 text-gray-400" /> Email us
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Need to update your email or request your data? Email us and we&apos;ll sort it within a few working days.
          </p>
        </div>
      </div>
    </div>
  )
}
