'use client'

// Click this to start a Stripe checkout for a single Adventure Pack
// at £4.99. The /api/stripe/checkout-pack route creates a one-off
// payment session (mode=payment) with kind:'adventure_pack' metadata
// so the webhook drops the resulting purchase into jax_pack_purchases.

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

type Props = {
  slug: string
  label?: string
  className?: string
}

export default function BuyPackButton({ slug, label = 'Buy this pack £4.99', className }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')

  const onClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const trimmedCode = code.trim()
      const res = await fetch('/api/stripe/checkout-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...(trimmedCode ? { code: trimmedCode } : {}) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.url) {
        throw new Error(body.error || `Checkout failed (HTTP ${res.status})`)
      }
      window.location.href = body.url as string
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={className ?? 'btn-primary w-full justify-center !py-2.5 !text-sm disabled:opacity-60'}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
          : <>{label} <ArrowRight className="w-4 h-4" /></>}
      </button>
      {!showCode ? (
        <button type="button" onClick={() => setShowCode(true)} className="block mt-1.5 text-xs text-gray-500 hover:text-brand-600 underline">
          Have a discount code?
        </button>
      ) : (
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Discount code"
          className="mt-1.5 w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      )}
      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
    </>
  )
}
