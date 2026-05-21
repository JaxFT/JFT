'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown, ChevronUp, Loader2, CreditCard } from 'lucide-react'
import CallThread from '@/components/call-requests/CallThread'
import {
  DAY_LABEL, TIME_LABEL,
  type CallRequestRow as CallRequest,
  type CallRequestMessageRow,
  type CallRequestStatus,
} from '@/lib/call-requests-db'

const STATUS_LABEL: Record<CallRequestStatus, string> = {
  new: 'New',
  replied: 'Replied',
  scheduled: 'Scheduled',
  completed: 'Completed',
  declined: 'Declined',
}

const STATUS_COLOURS: Record<CallRequestStatus, string> = {
  new: 'bg-amber-100 text-amber-900',
  replied: 'bg-brand-100 text-brand-900',
  scheduled: 'bg-blue-100 text-blue-900',
  completed: 'bg-gray-100 text-gray-700',
  declined: 'bg-red-50 text-red-800',
}

const JOURNEY_LABEL: Record<NonNullable<CallRequest['journey_stage']>, string> = {
  dreaming: 'Dreaming about it',
  planning: 'Actively planning',
  soon: 'Leaving soon',
  already: 'Already on the road',
}

type Props = {
  request: CallRequest
  messages: CallRequestMessageRow[]
  paymentLinkUrl: string | null
}

export default function CallRequestRow({ request, messages, paymentLinkUrl }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(request.status === 'new' || messages.some(m => m.sender === 'user'))
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<CallRequestStatus>(request.status)
  // Used by the "Send payment link" quick action to seed the textarea
  // with a friendly message + the link, ready for the admin to send.
  const [draftSeed, setDraftSeed] = useState('')
  const [draftSeedNonce, setDraftSeedNonce] = useState(0)

  const created = new Date(request.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const days  = request.preferred_days.map(d => DAY_LABEL[d] ?? d).join(', ')
  const times = request.preferred_times.map(t => TIME_LABEL[t] ?? t).join(', ')

  const changeStatus = async (next: CallRequestStatus) => {
    if (next === status) return
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/call-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setStatus(next)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  const remove = async () => {
    if (!confirm('Delete this request? This cannot be undone.')) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/call-requests/${request.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setUpdating(false)
    }
  }

  const seedPaymentLink = () => {
    if (!paymentLinkUrl) return
    setDraftSeed(
      `Looking forward to our call. Here's the payment link to confirm the booking, once you've paid you'll see the confirmation in your account:\n\n${paymentLinkUrl}\n\nLet me know if anything pops up.`,
    )
    setDraftSeedNonce(n => n + 1)
  }

  return (
    <div id={request.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50"
      >
        <span className={`text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOURS[status]}`}>
          {STATUS_LABEL[status]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{request.name}</p>
          <p className="text-xs text-gray-500 truncate">{request.email} · {created}{messages.length > 0 && ` · ${messages.length} message${messages.length === 1 ? '' : 's'}`}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Family">{request.family_situation || <em className="text-gray-400">not provided</em>}</Field>
            <Field label="Based in">{request.where_now || <em className="text-gray-400">not provided</em>}</Field>
            <Field label="Stage">{request.journey_stage ? JOURNEY_LABEL[request.journey_stage] : <em className="text-gray-400">not provided</em>}</Field>
            <Field label="Timezone">{request.timezone || <em className="text-gray-400">not provided</em>}</Field>
            <Field label="Preferred days">{days || <em className="text-gray-400">any</em>}</Field>
            <Field label="Preferred times">{times || <em className="text-gray-400">any</em>}</Field>
          </div>

          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">What they'd like to discuss</p>
            <p className="text-sm text-gray-700 leading-relaxed bg-sand-50 rounded-lg p-3 whitespace-pre-wrap">{request.what_to_discuss}</p>
          </div>

          {/* Thread */}
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">Conversation</p>
            <CallThread
              key={draftSeedNonce}
              requestId={request.id}
              initialMessages={messages}
              viewerRole="admin"
              initialDraft={draftSeed}
              composerExtras={(
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={seedPaymentLink}
                    disabled={!paymentLinkUrl}
                    title={paymentLinkUrl ? 'Drops the payment link into the message draft below' : 'STRIPE_PAYMENT_LINK_1_TO_1_CALL env var not set'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Send payment link
                  </button>
                </div>
              )}
            />
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
            <div className="flex gap-1.5 flex-wrap">
              {(['new', 'replied', 'scheduled', 'completed', 'declined'] as CallRequestStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  disabled={updating || s === status}
                  onClick={() => changeStatus(s)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-colors ${
                    s === status
                      ? 'border-brand-500 bg-brand-50 text-brand-800 cursor-default'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={remove}
              disabled={updating}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-2 py-1.5"
            >
              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-700">{children}</p>
    </div>
  )
}
