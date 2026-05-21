'use client'

// Shared thread + reply box used on the admin call-requests page
// AND on the user's /account page. Both surfaces hit the same
// /api/call-requests/[id]/messages endpoint; access rules are
// enforced server-side via resolveAccess().

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import type { CallRequestMessageRow } from '@/lib/call-requests-db'

type Props = {
  requestId: string
  initialMessages: CallRequestMessageRow[]
  // 'admin' renders messages from admin on the right with the brand
  // colour; 'user' renders the user's own messages on the right.
  viewerRole: 'admin' | 'user'
  // Optional helper buttons rendered above the textarea, e.g. the
  // admin's "Send payment link" quick action.
  composerExtras?: React.ReactNode
  // Text inserted into the textarea on mount. Used when a parent
  // wants to pre-fill (e.g. payment-link quick action).
  initialDraft?: string
}

function fmt(iso: string): string {
  const d = new Date(iso)
  const sameDay = new Date().toDateString() === d.toDateString()
  if (sameDay) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Pull http(s) URLs out of body text and render as anchors so the
// admin's "here's your payment link" message is clickable on the
// user side without any markdown pipeline.
function renderBody(body: string) {
  const parts = body.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all hover:text-rose-700">
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function CallThread({
  requestId,
  initialMessages,
  viewerRole,
  composerExtras,
  initialDraft = '',
}: Props) {
  const [messages, setMessages] = useState<CallRequestMessageRow[]>(initialMessages)
  const [draft, setDraft] = useState(initialDraft)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const body = draft.trim()
    if (!body) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/call-requests/${requestId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Send failed (HTTP ${res.status})`)
      setMessages(prev => [...prev, data.message as CallRequestMessageRow])
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      {messages.length === 0 ? (
        <p className="text-xs text-gray-400 italic mb-3">No messages yet. {viewerRole === 'admin' ? 'Reply below to start the thread.' : 'Bec or Oli will be in touch shortly.'}</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {messages.map(m => {
            const mine = m.sender === viewerRole
            return (
              <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  mine ? 'bg-brand-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  <div>{renderBody(m.body)}</div>
                  <div className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-gray-400'}`}>
                    {m.sender === 'admin' ? 'Bec / Oli' : 'You'} · {fmt(m.created_at)}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={send} className="space-y-2">
        {composerExtras}
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder={viewerRole === 'admin' ? 'Reply to the requester…' : 'Reply to Bec / Oli…'}
          className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={sending || draft.trim().length === 0}
            className="btn-primary !text-sm !py-2 !px-4 disabled:opacity-50"
          >
            {sending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
              : <><Send className="w-3.5 h-3.5" /> Send</>}
          </button>
        </div>
      </form>
    </div>
  )
}
