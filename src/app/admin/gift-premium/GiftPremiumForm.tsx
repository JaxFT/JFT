'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Loader2, Undo2 } from 'lucide-react'
import type { PremiumGiftRow } from './page'

export default function GiftPremiumForm({ initialGifts }: { initialGifts: PremiumGiftRow[] }) {
  const router = useRouter()
  const [gifts, setGifts] = useState<PremiumGiftRow[]>(initialGifts)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const gift = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setWarning(null)
    setSuccess(null)
    setSending(true)
    try {
      const res = await fetch('/api/admin/gift-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), note: note.trim() || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setSuccess(`Gifted a year of Premium to ${body.email}, active until ${new Date(body.expiresAt).toLocaleDateString('en-GB')}.`)
      if (body.warning) setWarning(body.warning)
      setEmail('')
      setNote('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to gift Premium')
    } finally {
      setSending(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm('Revoke this gift and drop them back to free now?')) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/gift-premium/${id}`, { method: 'PATCH' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setGifts(prev => prev.map(g => (g.id === id ? { ...g, revoked_at: new Date().toISOString() } : g)))
      router.refresh()
    } catch {
      // List still reflects true state on next load.
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={gift} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Gift a year of Premium</p>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            type="email"
            placeholder="member@example.com"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Note (optional, for your own reference)</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Competition winner, birthday gift"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {error && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}
        {warning && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">{warning}</p>}
        {success && <p className="text-xs text-brand-700 bg-brand-50 border border-brand-100 rounded-md px-3 py-2">{success}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
          >
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Gifting…</> : <><Gift className="w-4 h-4" /> Gift Premium</>}
          </button>
        </div>
      </form>

      {gifts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No gifts yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {gifts.map(g => (
              <li key={g.id} className="p-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{g.email ?? g.user_id}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Granted {new Date(g.granted_at).toLocaleDateString('en-GB')} by {g.granted_by} · expires {new Date(g.expires_at).toLocaleDateString('en-GB')}
                    {g.note && ` · ${g.note}`}
                  </p>
                </div>
                {g.revoked_at ? (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500">Revoked</span>
                ) : (
                  <button
                    onClick={() => revoke(g.id)}
                    disabled={busyId === g.id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 px-2 py-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    {busyId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
