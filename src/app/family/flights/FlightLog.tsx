'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plane, Plus, Loader2, Pencil, Trash2, X, Check, Stamp as StampIcon,
} from 'lucide-react'
import type { FlightRow } from '@/lib/passport-db'

export default function FlightLog({
  initialFlights,
  childCount,
}: {
  initialFlights: FlightRow[]
  childCount: number
}) {
  const router = useRouter()
  const [flights, setFlights] = useState<FlightRow[]>(initialFlights)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Add form
  const [adding, setAdding] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState(today())
  const [duration, setDuration] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastAwarded, setLastAwarded] = useState<number | null>(null)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setLastAwarded(null)
    try {
      const res = await fetch('/api/family/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_airport: from.trim(),
          to_airport: to.trim(),
          flight_date: date,
          duration_mins: duration ? parseInt(duration, 10) : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setFlights(prev => [{
        id: body.id ?? `tmp-${Date.now()}`,
        from_airport: from.trim(),
        to_airport: to.trim(),
        flight_date: date,
        duration_mins: duration ? parseInt(duration, 10) : null,
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, ...prev])
      setLastAwarded(body.stamps_awarded ?? 0)
      setFrom('')
      setTo('')
      setDate(today())
      setDuration('')
      setNotes('')
      setAdding(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save flight')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this flight? The Brave Traveller stamps already earned will stay in each child\'s passport.')) return
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/family/flights/${id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setFlights(prev => prev.filter(f => f.id !== id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete flight')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      {/* Add form */}
      {adding ? (
        <form onSubmit={add} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-gray-900">New flight</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">From</label>
              <input
                type="text"
                value={from}
                onChange={e => setFrom(e.target.value)}
                required
                maxLength={60}
                placeholder="London"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">To</label>
              <input
                type="text"
                value={to}
                onChange={e => setTo(e.target.value)}
                required
                maxLength={60}
                placeholder="Tokyo"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                max={today()}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Duration (minutes, optional)</label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                min={1}
                max={24 * 60}
                placeholder="720"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="e.g. Heathrow → Haneda, BA005, kids on iPads the whole way"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>

          {childCount > 0 && (
            <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
              <StampIcon className="w-3.5 h-3.5" />
              Will award a Brave Traveller stamp to {childCount} {childCount === 1 ? 'child' : 'children'}.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !from.trim() || !to.trim()}
              className="btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-60"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save flight</>}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setError(null) }}
              disabled={submitting}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => { setAdding(true); setLastAwarded(null); setError(null) }}
          className="w-full mb-6 inline-flex items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-200 hover:border-brand-300 rounded-xl py-4 text-sm font-medium text-gray-500 hover:text-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Log a flight
        </button>
      )}

      {/* Confirmation toast after a successful add */}
      {lastAwarded !== null && lastAwarded > 0 && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mb-6 text-sm text-brand-900 inline-flex items-center gap-2">
          <StampIcon className="w-4 h-4" />
          Awarded {lastAwarded} Brave Traveller {lastAwarded === 1 ? 'stamp' : 'stamps'}.
        </div>
      )}

      {/* Flight list */}
      {flights.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Plane className="w-7 h-7 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No flights logged yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {flights.map(f => (
            <FlightRowItem
              key={f.id}
              flight={f}
              isEditing={editingId === f.id}
              isBusy={busy === f.id}
              onEdit={() => setEditingId(f.id)}
              onCancel={() => setEditingId(null)}
              onRemove={() => remove(f.id)}
              onSaved={updated => {
                setFlights(prev => prev.map(x => x.id === f.id ? updated : x))
                setEditingId(null)
                router.refresh()
              }}
            />
          ))}
        </ul>
      )}
    </>
  )
}

function FlightRowItem({
  flight,
  isEditing,
  isBusy,
  onEdit,
  onCancel,
  onRemove,
  onSaved,
}: {
  flight: FlightRow
  isEditing: boolean
  isBusy: boolean
  onEdit: () => void
  onCancel: () => void
  onRemove: () => void
  onSaved: (updated: FlightRow) => void
}) {
  const [from, setFrom] = useState(flight.from_airport)
  const [to, setTo] = useState(flight.to_airport)
  const [date, setDate] = useState(flight.flight_date)
  const [duration, setDuration] = useState<string>(flight.duration_mins ? String(flight.duration_mins) : '')
  const [notes, setNotes] = useState(flight.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/family/flights/${flight.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_airport: from.trim(),
          to_airport: to.trim(),
          flight_date: date,
          duration_mins: duration ? parseInt(duration, 10) : null,
          notes: notes.trim() || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      onSaved({
        ...flight,
        from_airport: from.trim(),
        to_airport: to.trim(),
        flight_date: date,
        duration_mins: duration ? parseInt(duration, 10) : null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <li className="bg-sand-50 rounded-xl p-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={from}
            onChange={e => setFrom(e.target.value)}
            placeholder="From"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="text"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="To"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="Duration (mins)"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value.slice(0, 500))}
          rows={2}
          placeholder="Notes"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
        />
        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving || !from.trim() || !to.trim()}
            className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
          >
            Cancel
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Plane className="w-4 h-4 text-brand-600 mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900">
            {flight.from_airport} <span className="text-gray-400 mx-1">→</span> {flight.to_airport}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(flight.flight_date)}
            {flight.duration_mins ? ` · ${formatDuration(flight.duration_mins)}` : ''}
          </p>
          {flight.notes && (
            <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{flight.notes}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            disabled={isBusy}
            className="p-2 text-gray-400 hover:text-brand-700 hover:bg-gray-50 rounded-md disabled:opacity-50"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={isBusy}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-md disabled:opacity-50"
            aria-label="Delete"
            title="Delete"
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </li>
  )
}

function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate(s: string): string {
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
