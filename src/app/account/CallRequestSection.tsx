import { MessageCircle } from 'lucide-react'
import CallThread from '@/components/call-requests/CallThread'
import {
  DAY_LABEL, TIME_LABEL,
  type CallRequestRow, type CallRequestMessageRow, type CallRequestStatus,
} from '@/lib/call-requests-db'

const STATUS_BADGE: Record<CallRequestStatus, { label: string; cls: string }> = {
  new:        { label: 'Awaiting reply', cls: 'bg-amber-100 text-amber-900' },
  replied:    { label: 'Reply waiting',  cls: 'bg-brand-100 text-brand-900' },
  scheduled:  { label: 'Scheduled',      cls: 'bg-blue-100 text-blue-900' },
  completed:  { label: 'Completed',      cls: 'bg-gray-100 text-gray-700' },
  declined:   { label: 'Declined',       cls: 'bg-red-50 text-red-800' },
}

export default function CallRequestSection({
  request,
  messages,
}: {
  request: CallRequestRow
  messages: CallRequestMessageRow[]
}) {
  const sent = new Date(request.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const days  = request.preferred_days.map(d => DAY_LABEL[d] ?? d).join(', ')
  const times = request.preferred_times.map(t => TIME_LABEL[t] ?? t).join(', ')
  const badge = STATUS_BADGE[request.status]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-bold text-gray-900">Your 1:1 call request</h2>
        </div>
        <span className={`text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-sand-50 rounded-lg p-4 mb-5">
        <p><span className="text-gray-500">Sent: </span><span className="text-gray-800">{sent}</span></p>
        {request.timezone && <p><span className="text-gray-500">Your timezone: </span><span className="text-gray-800">{request.timezone}</span></p>}
        {days  && <p><span className="text-gray-500">Days you picked: </span><span className="text-gray-800">{days}</span></p>}
        {times && <p><span className="text-gray-500">Times you picked: </span><span className="text-gray-800">{times}</span></p>}
      </div>

      <CallThread requestId={request.id} initialMessages={messages} viewerRole="user" />
    </div>
  )
}
