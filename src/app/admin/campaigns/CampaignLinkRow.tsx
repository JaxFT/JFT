'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Check, MousePointerClick, Eye, ShoppingCart, CreditCard, ExternalLink, Send, Tag } from 'lucide-react'
import type { CampaignStats } from '@/lib/campaign-links-db'

function pct(n: number, of: number | null): string {
  if (!of) return '—'
  return `${Math.round((n / of) * 100)}%`
}

export default function CampaignLinkRow({ stats, siteUrl }: { stats: CampaignStats; siteUrl: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sentDraft, setSentDraft] = useState(stats.sentCount?.toString() ?? '')
  const url = `${siteUrl}/l/${stats.code}`

  const toggle = async () => {
    setBusy(true)
    try {
      await fetch(`/api/admin/campaign-links/${stats.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !stats.active }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const saveSentCount = async () => {
    const parsed = sentDraft.trim() ? Number(sentDraft) : null
    if (parsed === stats.sentCount) return
    await fetch(`/api/admin/campaign-links/${stats.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentCount: parsed }),
    })
    router.refresh()
  }

  const copy = () => {
    void navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <li className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span className={`text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${
          stats.active ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-500'
        }`}>
          {stats.active ? 'Live' : 'Paused'}
        </span>
        <code className="text-sm font-semibold text-gray-900">{stats.code}</code>
        <Link href={`/guides/${stats.guideSlug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600">
          /{stats.guideSlug} <ExternalLink className="w-3 h-3" />
        </Link>
        {stats.label && <span className="text-xs text-gray-400 italic">{stats.label}</span>}
        {stats.discountCode && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
            <Tag className="w-3 h-3" /> {stats.discountCode.percentOff}% off ({stats.discountCode.code})
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-brand-700"
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> {url}</>}
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="text-xs font-medium text-gray-500 hover:text-gray-900 underline disabled:opacity-50"
        >
          {stats.active ? 'Pause' : 'Resume'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 flex items-center gap-1"><Send className="w-3 h-3" /> Sent</p>
          <input
            type="number"
            min={0}
            value={sentDraft}
            onChange={e => setSentDraft(e.target.value)}
            onBlur={saveSentCount}
            placeholder="—"
            title="Entered by hand, we can't measure how many were actually sent"
            className="w-full text-lg font-bold text-gray-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-400 rounded -ml-0.5 pl-0.5"
          />
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> Clicked</p>
          <p className="text-lg font-bold text-gray-900">{stats.clicks} <span className="text-xs font-normal text-gray-400">{pct(stats.clicks, stats.sentCount)}</span></p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 flex items-center gap-1"><Eye className="w-3 h-3" /> Viewed</p>
          <p className="text-lg font-bold text-gray-900">{stats.views} <span className="text-xs font-normal text-gray-400">{pct(stats.views, stats.clicks)}</span></p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Clicked buy</p>
          <p className="text-lg font-bold text-gray-900">{stats.buyClicks} <span className="text-xs font-normal text-gray-400">{pct(stats.buyClicks, stats.views)}</span></p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Purchased</p>
          <p className="text-lg font-bold text-gray-900">{stats.purchases} <span className="text-xs font-normal text-gray-400">{pct(stats.purchases, stats.buyClicks)}</span></p>
        </div>
      </div>
    </li>
  )
}
