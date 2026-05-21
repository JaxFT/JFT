import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Inbox } from 'lucide-react'
import CallRequestRow from './CallRequestRow'
import { adminClient, type CallRequestRow as CallRequest, type CallRequestMessageRow } from '@/lib/call-requests-db'

export const metadata: Metadata = {
  title: 'Admin · Call requests',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function CallRequestsAdminPage() {
  // The /admin layout has already verified admin email, so service-role
  // is safe here. Saves us granting cookie-auth select policies just
  // for this admin path.
  const admin = adminClient()
  const [requestsRes, messagesRes] = await Promise.all([
    admin.from('call_requests').select('*').order('updated_at', { ascending: false }),
    admin.from('call_request_messages').select('id, call_request_id, sender, body, created_at').order('created_at', { ascending: true }),
  ])
  const requests = (requestsRes.data ?? []) as CallRequest[]
  const allMessages = (messagesRes.data ?? []) as CallRequestMessageRow[]
  const messagesByRequest = new Map<string, CallRequestMessageRow[]>()
  for (const m of allMessages) {
    const list = messagesByRequest.get(m.call_request_id) ?? []
    list.push(m)
    messagesByRequest.set(m.call_request_id, list)
  }

  const newCount = requests.filter(r => r.status === 'new').length
  // Stripe payment link for the 1:1 call. Created once in the Stripe
  // dashboard from price_1TTiBrBedsajl023fzvQPfgK and pasted here as
  // an env var. The "Send payment link" quick action is disabled
  // until this is set.
  const paymentLinkUrl = process.env.STRIPE_PAYMENT_LINK_1_TO_1_CALL ?? null

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
            {requests.map(r => (
              <CallRequestRow
                key={r.id}
                request={r}
                messages={messagesByRequest.get(r.id) ?? []}
                paymentLinkUrl={paymentLinkUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
