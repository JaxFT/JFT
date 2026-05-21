import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Crown, ShoppingBag, ArrowRight, Calendar, ShieldCheck, FileText, Mail } from 'lucide-react'
import WaystaqCard from '@/components/WaystaqCard'
import type { Metadata } from 'next'
import SignOutButton from './SignOutButton'
import AccountEditor from './AccountEditor'
import PremiumCancelButton from './PremiumCancelButton'
import ResumeMembershipButton from './ResumeMembershipButton'
import UpgradeButton from '@/components/billing/UpgradeButton'
import ManageBillingButton from '@/components/billing/ManageBillingButton'
import FamilyPassportSection from './FamilyPassportSection'
import DeleteAccountButton from './DeleteAccountButton'
import { isPremiumTier } from '@/lib/profile'
import { ensureProfile } from '@/lib/ensure-profile'
import { isAdminEmail } from '@/lib/admin'
import { adminClient, type CallRequestRow, type CallRequestMessageRow } from '@/lib/call-requests-db'
import CallRequestSection from './CallRequestSection'
import { PACK_META } from '@/lib/adventurePackMeta'

export const metadata: Metadata = { title: 'Account' }
export const dynamic = 'force-dynamic'

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
  const [{ data: profile }, { data: purchasesData }, { data: packPurchasesData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, subscription_tier, created_at, marketing_opt_in, cancellation_requested_at, username, instagram_handle')
      .eq('id', user.id)
      .single(),
    supabase
      .from('purchases')
      .select('id, purchased_at, amount_pence, products(name, slug, type)')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false }),
    // One-off Adventure Pack purchases live in their own ledger
    // (jax_pack_purchases) because the legacy products table doesn't
    // cover them. Merged into the unified purchases list below.
    supabase
      .from('jax_pack_purchases')
      .select('id, country_slug, purchased_at')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false }),
  ])

  const purchases = (purchasesData ?? []) as unknown as PurchaseRow[]
  const packPurchases = (packPurchasesData ?? []) as Array<{ id: string; country_slug: string; purchased_at: string }>
  const isPremium = isPremiumTier(profile?.subscription_tier)

  // Normalise the two ledgers into a single list for display. Pack
  // purchases are always £4.99 (flat price), so we don't need to
  // store amount per row, just hardcode the label here.
  type UnifiedPurchase = {
    key: string
    name: string
    purchased_at: string
    type: string
    href: string | null
    priceLabel: string
  }
  const allPurchases: UnifiedPurchase[] = [
    ...purchases.map(p => ({
      key: `p-${p.id}`,
      name: p.products?.name ?? 'Unknown item',
      purchased_at: p.purchased_at,
      type: p.products?.type ?? 'one-off',
      href: p.products?.slug ? `/guides/${p.products.slug}` : null,
      priceLabel: `£${(p.amount_pence / 100).toFixed(2)}`,
    })),
    ...packPurchases.map(p => {
      const meta = PACK_META.find(m => m.slug === p.country_slug)
      return {
        key: `pack-${p.id}`,
        name: `${meta?.country ?? p.country_slug} Adventure Pack`,
        purchased_at: p.purchased_at,
        type: 'adventure-pack',
        href: `/adventure-packs/${p.country_slug}`,
        priceLabel: '£4.99',
      }
    }),
  ].sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime())

  // User's most recent 1:1 call request (if any) + its full thread.
  // Service role here is fine, we just queried the user's own row so
  // the data scope is intentional. Avoids relying on every viewer
  // having a working RLS policy chain on first load.
  let callRequest: CallRequestRow | null = null
  let callMessages: CallRequestMessageRow[] = []
  try {
    const admin = adminClient()
    const { data: reqRow } = await admin
      .from('call_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (reqRow) {
      callRequest = reqRow as CallRequestRow
      const { data: msgs } = await admin
        .from('call_request_messages')
        .select('id, call_request_id, sender, body, kind, metadata, created_at')
        .eq('call_request_id', callRequest.id)
        .order('created_at', { ascending: true })
      callMessages = (msgs ?? []) as CallRequestMessageRow[]
    }
  } catch {
    // Service role not configured in dev preview, swallow so the
    // page still renders without the call section.
  }
  // An active subscription means we have a paid tier AND there is no
  // cancellation already in flight. Used by the delete-account modal
  // to warn the user before they wipe their account.
  const hasActiveSubscription = isPremium && !profile?.cancellation_requested_at
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

        {/* 1 ── SUBSCRIPTION / TIER STATUS ─────────────────────── */}
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
                  ? 'Every premium blog post, every guide, every Adventure Pack, and the full Family Passport are included.'
                  : 'A year of access to every premium blog post, every guide, every Adventure Pack, and the Family Passport, £49.99/year.'}
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

        {/* 2 ── FAMILY PASSPORT (premium-only) ──────────────────── */}
        {isPremium && (
          <div className="mb-6">
            <FamilyPassportSection />
          </div>
        )}

        {/* 3 ── DETAILS (email / password / name) + EMAIL PREFS ── */}
        <div className="mb-6">
          <AccountEditor
            initialFullName={profile?.full_name ?? ''}
            email={user.email ?? ''}
            initialMarketingOptIn={!!profile?.marketing_opt_in}
            initialUsername={(profile as { username?: string | null } | null)?.username ?? null}
            initialUsernameIsInstagram={!!(profile as { username_is_instagram?: boolean } | null)?.username_is_instagram}
            initialInstagramHandle={(profile as { instagram_handle?: string | null } | null)?.instagram_handle ?? null}
            isAdmin={isAdminEmail(user.email)}
          />
        </div>

        {/* 3.5 ── YOUR 1:1 CALL REQUEST ─────────────────────────
            Only shown when the user has booked a call. Anchored as
            #call-request so reply-notification emails can deep-link
            straight to the thread. */}
        {callRequest && (
          <div className="mb-6" id="call-request">
            <CallRequestSection request={callRequest} messages={callMessages} />
          </div>
        )}

        {/* 4 ── YOUR PURCHASES ───────────────────────────────────
            Premium members see "You have access to everything" by
            default, since Premium IS the access. Standalone one-off
            purchases (a guide bought separately, for example) still
            list below if they exist. Free users see the list as
            before, or the empty CTA if they've never bought anything. */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">Your purchases</h2>
          </div>

          {isPremium && (
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-4 inline-flex items-center gap-3">
              <Crown className="w-5 h-5 text-brand-700 shrink-0" />
              <p className="text-sm text-brand-900">
                <span className="font-semibold">You have access to everything.</span>{' '}
                Premium covers every guide, every Adventure Pack, every premium blog post, and the Family Passport.
              </p>
            </div>
          )}

          {allPurchases.length === 0 ? (
            !isPremium && (
              <div className="text-center py-10">
                <p className="text-gray-500 text-sm mb-5">You haven&apos;t bought anything yet.</p>
                <Link href="/guides" className="btn-outline !py-2 !px-4 !text-sm">
                  Browse guides <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )
          ) : (
            <>
              {isPremium && (
                <p className="text-xs text-gray-500 mb-2">One-off purchases you made before Premium (or for items not included):</p>
              )}
              <ul className="divide-y divide-gray-100">
                {allPurchases.map(p => (
                  <li key={p.key} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      {p.href ? (
                        <Link href={p.href} className="font-semibold text-gray-900 text-sm hover:text-brand-700">{p.name}</Link>
                      ) : (
                        <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(p.purchased_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{p.type}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 shrink-0">{p.priceLabel}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* 4.5 ── WAYSTAQ CROSS-PROMO ────────────────────────────
            Compact, brand-styled. When bundle pricing ships, swap to
            a tier-aware copy / title. */}
        <div className="mt-6">
          <WaystaqCard variant="compact" />
        </div>

        {/* 5 ── HELP & LEGAL ────────────────────────────────────── */}
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
        </div>

        {/* 6 ── DELETE ACCOUNT ──────────────────────────────────── */}
        <DeleteAccountButton hasActiveSubscription={hasActiveSubscription} />
      </div>
    </div>
  )
}
