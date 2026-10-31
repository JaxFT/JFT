import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { createClient as createSbClient } from '@supabase/supabase-js'
import ReelsClient, { type Reel } from './ReelsClient'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'Admin · Reel Analytics',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function ReelsPage() {
  await requireAdminPage()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createSbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
  const { data } = await supabase
    .from('reels')
    .select('*')
    .order('posted_date', { ascending: false, nullsFirst: false })

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold tracking-widest uppercase">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <Link href="/admin" className="text-brand-600 hover:underline">Admin</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">Reel Analytics</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reel Analytics</h1>
        <p className="text-gray-500 mb-8">
          Log every reel, track what lands, export to CSV and ask your AI what to make next.
        </p>
        <ReelsClient initialReels={(data ?? []) as Reel[]} />
      </div>
    </div>
  )
}
