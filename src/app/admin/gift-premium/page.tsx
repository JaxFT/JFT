import Link from 'next/link'
import { ShieldCheck, Gift } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient as createSbClient } from '@supabase/supabase-js'
import GiftPremiumForm from './GiftPremiumForm'

export const metadata: Metadata = {
  title: 'Admin · Gift Premium',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export type PremiumGiftRow = {
  id: string
  user_id: string
  email: string | null
  granted_by: string
  granted_at: string
  expires_at: string
  note: string | null
  revoked_at: string | null
}

// Same reasoning as /admin/discount-codes: premium_gifts has no RLS
// policies, so the initial read uses the service-role client. Emails
// aren't stored on profiles, so they're resolved from auth.users here
// too (same lookup the API route does for its own GET).
export default async function AdminGiftPremiumPage() {
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data: rows } = await admin
    .from('premium_gifts')
    .select('id, user_id, granted_by, granted_at, expires_at, note, revoked_at')
    .order('granted_at', { ascending: false })
    .limit(200)

  const gifts: PremiumGiftRow[] = await Promise.all(
    (rows ?? []).map(async g => {
      const { data } = await admin.auth.admin.getUserById(g.user_id)
      return { ...g, email: data.user?.email ?? null }
    }),
  )

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
          <span className="text-xs text-gray-400">/</span>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Gift Premium</p>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Gift className="w-7 h-7 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900">Gift Premium</h1>
        </div>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Give an existing member a year of Premium, free, no Stripe charge. They need an account already, if the email doesn't have one yet, ask them to sign up first. Auto-expires a year after granting unless they take out a real subscription first.
        </p>

        <GiftPremiumForm initialGifts={gifts} />
      </div>
    </div>
  )
}
