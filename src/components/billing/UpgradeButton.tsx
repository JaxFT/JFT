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

  const start = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/subscribe', { method: 'POST' })
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
      {error && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
      )}
    </>
  )
}
