'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Copy, Check } from 'lucide-react'

type GuideOption = { slug: string; label: string; pricePence: number }
type DiscountCodeOption = { id: string; code: string; percentOff: number }

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

export default function CreateCampaignLinkForm({ guides, siteUrl, discountCodes }: { guides: GuideOption[]; siteUrl: string; discountCodes: DiscountCodeOption[] }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [guideSlug, setGuideSlug] = useState(guides[0]?.slug ?? '')
  const [label, setLabel] = useState('')
  const [sentCount, setSentCount] = useState('')
  const [discountCodeId, setDiscountCodeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const selectedGuide = guides.find(g => g.slug === guideSlug)
  const selectedDiscount = discountCodes.find(d => d.id === discountCodeId)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/campaign-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          guideSlug,
          label: label.trim() || null,
          sentCount: sentCount.trim() ? Number(sentCount) : null,
          discountCodeId: discountCodeId || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setCreatedUrl(`${siteUrl}/l/${body.code}`)
      setCode('')
      setLabel('')
      setSentCount('')
      setDiscountCodeId('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create link')
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    if (!createdUrl) return
    void navigator.clipboard.writeText(createdUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
      <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">New campaign link</p>
      <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_90px_1fr_auto] gap-3 items-start">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="sri-lanka-ig-aug"
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Guide</label>
          <select
            value={guideSlug}
            onChange={e => setGuideSlug(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {guides.map(g => (
              <option key={g.slug} value={g.slug}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sent</label>
          <input
            type="number"
            min={0}
            value={sentCount}
            onChange={e => setSentCount(e.target.value)}
            placeholder="60"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Label (optional, for you)</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Instagram story, Aug batch"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="sm:pt-6">
          <button
            type="submit"
            disabled={loading || !code || !guideSlug}
            className="btn-primary !py-2 !px-4 !text-sm w-full sm:w-auto justify-center disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
          </button>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Discount on landing (optional)</label>
          <select
            value={discountCodeId}
            onChange={e => setDiscountCodeId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">No discount</option>
            {discountCodes.map(d => (
              <option key={d.id} value={d.id}>{d.code} — {d.percentOff}% off</option>
            ))}
          </select>
          {discountCodes.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              No active codes scoped to guides yet — create one on <a href="/admin/discount-codes" className="underline hover:text-brand-600">Discount Codes</a> first (must have "applies to guides" checked).
            </p>
          )}
          {selectedDiscount && selectedGuide && (
            <p className="text-xs text-brand-700 mt-1 font-medium">
              Lands at {formatPrice(Math.round(selectedGuide.pricePence * (100 - selectedDiscount.percentOff) / 100))}, was {formatPrice(selectedGuide.pricePence)}.
            </p>
          )}
        </div>
      </form>
      <p className="text-xs text-gray-400 mt-2">Sent count is entered by hand, we can't measure how many DMs actually went out. You can also add or update it later. A discount code auto-applies for anyone who lands via this link and buys, no code typing needed, and still respects that code's own usage cap.</p>
      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3">{error}</p>}
      {createdUrl && (
        <div className="mt-4 flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-md px-3 py-2">
          <code className="text-sm text-brand-800 flex-1 break-all">{createdUrl}</code>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900 shrink-0"
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
      )}
    </div>
  )
}
