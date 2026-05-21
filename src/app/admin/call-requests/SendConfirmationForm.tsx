'use client'

// Inline form the admin uses after payment to lock in a date and
// time. POSTs to /api/call-requests/[id]/confirm which writes a
// 'confirmation' message into the thread; the realtime channel
// pushes the new message to both sides so we don't need to touch
// the thread state from here.

import { useState } from 'react'
import { Calendar, Loader2 } from 'lucide-react'

const COMMON_TIMEZONES = [
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export default function SendConfirmationForm({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('14:00')
  const [timezone, setTimezone] = useState('Europe/London')
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/call-requests/${requestId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time, timezone, durationMinutes: duration, notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setOpen(false)
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-md"
      >
        <Calendar className="w-3.5 h-3.5" /> Send confirmation
      </button>
    )
  }

  const inputCls = 'text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <form onSubmit={send} className="basis-full w-full border border-brand-200 bg-brand-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-brand-700" />
        <p className="text-xs font-bold tracking-widest uppercase text-brand-700">Confirm date and time</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">Date</label>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={`${inputCls} w-full`} />
        </div>
        <div>
          <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">Time</label>
          <input type="time" required value={time} onChange={e => setTime(e.target.value)} className={`${inputCls} w-full`} />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">Time zone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)} className={`${inputCls} w-full`}>
            {COMMON_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">Duration (min)</label>
          <input
            type="number"
            min={15}
            max={240}
            step={15}
            value={duration}
            onChange={e => setDuration(Math.max(15, Math.min(240, Number(e.target.value) || 60)))}
            className={`${inputCls} w-full`}
          />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">Joining info / notes (optional)</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Zoom link, dial-in, prep notes…"
            className={`${inputCls} w-full`}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1.5">Cancel</button>
        <button
          type="submit"
          disabled={sending || !date || !time}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</> : <><Calendar className="w-3.5 h-3.5" /> Send confirmation</>}
        </button>
      </div>
    </form>
  )
}
