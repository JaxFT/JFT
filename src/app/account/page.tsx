import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Crown, ShoppingBag, ArrowRight, Calendar } from 'lucide-react'
import type { Metadata } from 'next'
import SignOutButton from './SignOutButton'
import AccountEditor from './AccountEditor'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_tier, created_at')
    .eq('id', user.id)
    .single()

  const { data: purchasesData } = await supabase
    .from('purchases')
    .select('id, purchased_at, amount_pence, products(name, slug, type)')
    .eq('user_id', user.id)
    .order('purchased_at', { ascending: false })

  const purchases = (purchasesData ?? []) as unknown as PurchaseRow[]
  const isPremium = profile?.subscription_tier === 'premium'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '—'

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
                  ? 'All guides, learning packs, and the I Want To Travel tool are included.'
                  : 'Get every guide, every learning pack, and the I Want To Travel tool for £25/year.'}
              </p>
            </div>
            {!isPremium && (
              <button
                disabled
                className="btn-primary !py-2.5 !px-5 !text-sm shrink-0 opacity-60 cursor-not-allowed"
                title="Stripe checkout not yet wired up"
              >
                Upgrade — coming soon <ArrowRight className="w-4 h-4" />
              </button>
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
      </div>
    </div>
  )
}
