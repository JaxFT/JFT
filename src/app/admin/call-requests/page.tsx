import { createClient as createSbClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, MessageCircle, Inbox } from 'lucide-react'
import CallRequestRow from './CallRequestRow'

export const metadata: Metadata = {
  title: 'Admin · Call requests',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type CallRequest = {
  id: string
  name: string
  email: string
  family_situation: string | null
  where_now: string | null
  journey_stage: 'dreaming' | 'planning' | 'soon' | 'already' | null
  what_to_discuss: string
  timezone: string | null
  status: 'new' | 'replied' | 'scheduled' | 'completed' | 'declined'
  notes: string | null
  created_at: string
}

export default async function CallRequestsAdminPage() {
  // The /admin layout already gates this. We use service-role here only
  // because RLS for call_requests admin-reads needs a JWT, but the layout
  // already verified the email, so we can trust the request and fetch.
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data } = await admin
    .from('call_requests')
    .select('*')
    .order('created_at', { ascending: false })
  const requests = (data ?? []) as CallRequest[]

  const newCount = requests.filter(r => r.status === 'new').length

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold tracking-widest uppercase">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <Link href="/admin" className="text-brand-600 hover:underline">Admin</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">Call requests</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">1:1 call requests</h1>
        <p className="text-gray-500 mb-8">
          {requests.length === 0
            ? 'Nothing yet. New requests will appear here.'
            : `${requests.length} total · ${newCount} new`}
        </p>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nothing yet. New requests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(r => <CallRequestRow key={r.id} request={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}
