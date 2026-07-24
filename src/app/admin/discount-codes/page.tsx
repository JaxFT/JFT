import Link from 'next/link'
import { ShieldCheck, Ticket } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient as createSbClient } from '@supabase/supabase-js'
import DiscountCodesForm from './DiscountCodesForm'

export const metadata: Metadata = {
  title: 'Admin · Discount Codes',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export type DiscountCodeRow = {
  id: string
  code: string
  percent_off: number
  max_redemptions: number
  times_redeemed: number
  applies_to_premium: boolean
  applies_to_guides: boolean
  applies_to_packs: boolean
  active: boolean
  expires_at: string | null
  created_by: string
  created_at: string
}

// discount_codes has no RLS policies (locked to service-role, see
// supabase/discount-codes.sql), so the initial read here goes
// through the service-role client rather than the usual cookie
// client. Safe: this page only renders past the admin layout's
// isAdminEmail gate, and every write still goes through the
// service-role-backed /api/admin/discount-codes routes.
export default async function AdminDiscountCodesPage() {
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data: rows } = await admin
    .from('discount_codes')
    .select('id, code, percent_off, max_redemptions, times_redeemed, applies_to_premium, applies_to_guides, applies_to_packs, active, expires_at, created_by, created_at')
    .order('created_at', { ascending: false })

  const codes: DiscountCodeRow[] = (rows ?? []) as DiscountCodeRow[]

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
          <span className="text-xs text-gray-400">/</span>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Discount Codes</p>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Ticket className="w-7 h-7 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900">Discount Codes</h1>
        </div>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Percent-off codes with a usage cap. Customers redeem them on our own signup, account, and buy pages, never Stripe's own promo field. Usage is tracked here automatically as people pay.
        </p>

        <DiscountCodesForm initialCodes={codes} />
      </div>
    </div>
  )
}
