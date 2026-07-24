'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Power } from 'lucide-react'
import type { DiscountCodeRow } from './page'

export default function DiscountCodesForm({ initialCodes }: { initialCodes: DiscountCodeRow[] }) {
  const router = useRouter()
  const [codes, setCodes] = useState<DiscountCodeRow[]>(initialCodes)
  const [code, setCode] = useState('')
  const [percentOff, setPercentOff] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [appliesToPremium, setAppliesToPremium] = useState(true)
  const [appliesToGuides, setAppliesToGuides] = useState(false)
  const [appliesToPacks, setAppliesToPacks] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setAdding(true)
    try {
      const res = await fetch('/api/admin/discount-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          percentOff: Number(percentOff),
          maxRedemptions: Number(maxRedemptions),
          appliesToPremium,
          appliesToGuides,
          appliesToPacks,
          expiresAt: expiresAt || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setCodes(prev => [body.code, ...prev])
      setCode('')
      setPercentOff('')
      setMaxRedemptions('')
      setAppliesToPremium(true)
      setAppliesToGuides(false)
      setAppliesToPacks(false)
      setExpiresAt('')
      router.refresh()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create code')
    } finally {
      setAdding(false)
    }
  }

  const toggleActive = async (row: DiscountCodeRow) => {
    setBusyId(row.id)
    try {
      const res = await fetch(`/api/admin/discount-codes/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !row.active }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setCodes(prev => prev.map(c => (c.id === row.id ? { ...c, active: body.code.active } : c)))
      router.refresh()
    } catch {
      // Silently leave the toggle where it was, the list still shows the true state on next load.
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={add} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Create a code</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Code</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              required
              placeholder="JAXBIRTHDAY50"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Percent off</label>
            <input
              value={percentOff}
              onChange={e => setPercentOff(e.target.value)}
              required
              type="number"
              min={1}
              max={100}
              placeholder="50"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max uses</label>
            <input
              value={maxRedemptions}
              onChange={e => setMaxRedemptions(e.target.value)}
              required
              type="number"
              min={1}
              placeholder="10"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Applies to</label>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={appliesToPremium} onChange={e => setAppliesToPremium(e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              Premium annual
            </label>
            <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={appliesToGuides} onChange={e => setAppliesToGuides(e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              Individual guides
            </label>
            <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
              <input type="checkbox" checked={appliesToPacks} onChange={e => setAppliesToPacks(e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              Adventure Packs
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Expiry date (optional)</label>
          <input
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            type="date"
            className="w-full sm:w-56 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {addError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{addError}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={adding || !code.trim() || !percentOff || !maxRedemptions}
            className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
          >
            {adding ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create code</>}
          </button>
        </div>
      </form>

      {codes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No discount codes yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {codes.map(c => {
              const scopes = [
                c.applies_to_premium ? 'Premium' : null,
                c.applies_to_guides ? 'Guides' : null,
                c.applies_to_packs ? 'Packs' : null,
              ].filter(Boolean).join(', ')
              return (
                <li key={c.id} className="p-4 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-gray-900">{c.code}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.percent_off}% off · {scopes} · {c.times_redeemed}/{c.max_redemptions} used
                      {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString('en-GB')}`}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.active ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => toggleActive(c)}
                    disabled={busyId === c.id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-brand-700 px-2 py-1.5 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                    {c.active ? 'Deactivate' : 'Activate'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
