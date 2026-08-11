'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export default function BuyButton({ slug, priceLabel }: { slug: string; priceLabel: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')

  const buy = async () => {
    setError(null)
    setLoading(true)
    try {
      const trimmedCode = code.trim()
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...(trimmedCode ? { code: trimmedCode } : {}) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.url) {
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      // Send the user to Stripe's hosted checkout page
      window.location.href = body.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2.5">
      <button
        onClick={buy}
        disabled={loading}
        className="btn-primary w-full justify-center disabled:opacity-60"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Opening Stripe…</>
        ) : (
          <><Download className="w-4 h-4" /> Buy for {priceLabel}</>
        )}
      </button>
      {!showCode ? (
        <button type="button" onClick={() => setShowCode(true)} className="block text-xs text-gray-500 hover:text-brand-600 underline">
          Have a discount code?
        </button>
      ) : (
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Discount code"
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      )}
      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
      )}
    </div>
  )
}
