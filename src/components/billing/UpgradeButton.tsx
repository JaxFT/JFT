'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Crown, Loader2 } from 'lucide-react'

type Props = {
  label?: string
  className?: string
  withCrown?: boolean
}

export default function UpgradeButton({
  label = 'Upgrade to Premium',
  className = 'btn-primary',
  withCrown = false,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')

  const start = async () => {
    setError(null)
    setLoading(true)
    try {
      const trimmedCode = code.trim()
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trimmedCode ? { code: trimmedCode } : {}),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 401 && body.signInUrl) {
        router.push(body.signInUrl)
        return
      }
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
          <>
            {withCrown && <Crown className="w-4 h-4" />} {label} <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      {!showCode ? (
        <button type="button" onClick={() => setShowCode(true)} className="block mt-2 text-xs text-gray-500 hover:text-brand-600 underline">
          Have a discount code?
        </button>
      ) : (
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Discount code"
          className="mt-2 w-full max-w-[220px] px-2.5 py-1.5 border border-gray-200 rounded-md text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      )}
      {error && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
      )}
    </>
  )
}
