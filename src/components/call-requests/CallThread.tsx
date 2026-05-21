'use client'

// Shared thread + reply box used on the admin call-requests page
// AND on the user's /account page. Both surfaces hit the same
// /api/call-requests/[id]/messages endpoint; access rules are
// enforced server-side via resolveAccess().
//
// Subscribes to Supabase Realtime for new messages so the other
// side sees replies arrive without refreshing, plus pops a toast +
// bumps the tab title when a new message lands while the tab is
// hidden.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Calendar, Loader2, Send, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  type CallConfirmationMetadata,
  type CallRequestMessageRow,
} from '@/lib/call-requests-db'

type Props = {
  requestId: string
  initialMessages: CallRequestMessageRow[]
  viewerRole: 'admin' | 'user'
  composerExtras?: React.ReactNode
  initialDraft?: string
}

function fmt(iso: string): string {
  const d = new Date(iso)
  const sameDay = new Date().toDateString() === d.toDateString()
  if (sameDay) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

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

// Confirmation messages: the admin posts one of these to confirm the
// agreed call date/time. We render the scheduled time in the viewer's
// local timezone and a clickable "Add to my calendar" button that
// downloads a timezone-aware .ics so phone/laptop calendars pick the
// right local time automatically.
function ConfirmationCard({
  meta,
  callId,
}: { meta: CallConfirmationMetadata; callId: string }) {
  const start = new Date(meta.scheduledAtUtc)
  const end = new Date(start.getTime() + meta.durationMinutes * 60 * 1000)
  const fmtDateTime = (d: Date) => d.toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const downloadIcs = () => {
    const dt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Jax Family Travels//Call Confirmation//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:call-${callId}@jaxfamilytravels.com`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      'SUMMARY:1:1 call with Jax Family Travels',
      meta.notes ? `DESCRIPTION:${meta.notes.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')}` : 'DESCRIPTION:Your booked 1:1 with Bec and Oli.',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jft-1-1-call.ics'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-brand-700" />
        <p className="text-xs font-bold tracking-widest uppercase text-brand-700">Call confirmed</p>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{fmtDateTime(start)}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Until {end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}{' '}
          · shown in your local time ({viewerTz}). Booked in {meta.displayTimezone}.
        </p>
      </div>
      {meta.notes && (
        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-brand-100">{meta.notes}</p>
      )}
      <button
        type="button"
        onClick={downloadIcs}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-2 rounded-md"
      >
        <Calendar className="w-3.5 h-3.5" /> Add to my calendar
      </button>
    </div>
  )
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
  const [toast, setToast] = useState<string | null>(null)
  const unreadRef = useRef(0)
  const baseTitleRef = useRef<string>('')

  const dedupedAppend = useCallback((m: CallRequestMessageRow) => {
    setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]))
  }, [])

  // ── Realtime ─────────────────────────────────────────
  // Subscribe to inserts on this request's thread. RLS on
  // call_request_messages enforces the viewer can only receive rows
  // that belong to them (or all rows if they're admin), so no
  // additional client-side filtering needed.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`call-request-${requestId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_request_messages', filter: `call_request_id=eq.${requestId}` },
        payload => {
          const row = payload.new as CallRequestMessageRow
          dedupedAppend(row)
          if (row.sender !== viewerRole) {
            // New message from the OTHER side, alert this side.
            setToast(row.kind === 'confirmation' ? 'Call confirmed!' : 'New message')
            window.setTimeout(() => setToast(null), 4000)
            if (document.hidden) {
              unreadRef.current += 1
              if (!baseTitleRef.current) baseTitleRef.current = document.title
              document.title = `(${unreadRef.current}) ${baseTitleRef.current}`
            }
          }
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [requestId, viewerRole, dedupedAppend])

  // Reset title + unread count when the tab regains focus.
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden && baseTitleRef.current) {
        document.title = baseTitleRef.current
        unreadRef.current = 0
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

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
      dedupedAppend(data.message as CallRequestMessageRow)
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  const sorted = useMemo(() =>
    [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages])

  return (
    <div className="relative">
      {toast && (
        <div
          className="fixed top-20 right-4 z-50 bg-brand-700 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-[20rem]"
          role="status"
          aria-live="polite"
        >
          <Bell className="w-4 h-4" />
          {toast}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-white/70 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400 italic mb-3">No messages yet. {viewerRole === 'admin' ? 'Reply below to start the thread.' : 'Bec or Oli will be in touch shortly.'}</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {sorted.map(m => {
            const mine = m.sender === viewerRole

            if (m.kind === 'confirmation' && m.metadata) {
              // Centred card, full-width inside the bubble lane so the
              // calendar button is easy to tap on phones.
              return (
                <li key={m.id} className="flex justify-center">
                  <div className="w-full max-w-md">
                    <ConfirmationCard meta={m.metadata} callId={m.call_request_id} />
                    <p className="text-[10px] text-gray-400 mt-1 text-center">
                      {m.sender === 'admin' ? 'Bec / Oli' : 'You'} · {fmt(m.created_at)}
                    </p>
                  </div>
                </li>
              )
            }

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
