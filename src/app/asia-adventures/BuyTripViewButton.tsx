'use client'

// Buy CTA for the Asia Adventures trip-view product. POSTs to the
// checkout-trip-view endpoint and redirects to Stripe on success.
// Mirrors UpgradeButton's shape so it inherits the same disabled /
// loading / error states.

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

type Props = {
  label?: string
  className?: string
}

export default function BuyTripViewButton({
  label = 'Get access for £4.99',
  className = 'btn-primary',
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout-trip-view', { method: 'POST' })
      const body = await res.json().catch(() => ({})) as { url?: string; error?: string }
      if (!res.ok || !body.url) {
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      window.location.href = body.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className={`${className} disabled:opacity-60`}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Opening Stripe…</>
        ) : (
          <>{label} <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
      )}
    </>
  )
}
