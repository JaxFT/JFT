'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Copy, Check } from 'lucide-react'

type GuideOption = { slug: string; label: string }

export default function CreateCampaignLinkForm({ guides, siteUrl }: { guides: GuideOption[]; siteUrl: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [guideSlug, setGuideSlug] = useState(guides[0]?.slug ?? '')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/campaign-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, guideSlug, label: label.trim() || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setCreatedUrl(`${siteUrl}/l/${body.code}`)
      setCode('')
      setLabel('')
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
      <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
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
      </form>
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
