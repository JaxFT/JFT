'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.url) {
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      window.location.href = body.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open billing portal')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-md shrink-0 disabled:opacity-60"
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening…</>
        ) : (
          <><CreditCard className="w-3.5 h-3.5" /> Manage billing</>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-200 bg-red-950/30 border border-red-700/40 rounded-md px-3 py-2">{error}</p>
      )}
    </>
  )
}
