'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Crown, Loader2 } from 'lucide-react'

type Plan = 'annual' | 'monthly'

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
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')

  const start = async (plan: Plan) => {
    setError(null)
    setLoadingPlan(plan)
    try {
      // Discount codes only apply to the yearly plan, so the code is
      // simply never sent for a monthly checkout.
      const trimmedCode = plan === 'annual' ? code.trim() : ''
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, ...(trimmedCode ? { code: trimmedCode } : {}) }),
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
      setLoadingPlan(null)
    }
  }

  const busy = loadingPlan !== null

  return (
    <div className="inline-flex flex-col items-start">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => start('annual')}
          disabled={busy}
          className={`${className} disabled:opacity-60`}
        >
          {loadingPlan === 'annual' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Opening Stripe…</>
          ) : (
            <>
              {withCrown && <Crown className="w-4 h-4" />} {label} · £49.99/yr <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => start('monthly')}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-current/20 px-4 py-2 text-sm font-semibold opacity-90 hover:opacity-100 disabled:opacity-60"
        >
          {loadingPlan === 'monthly' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Opening Stripe…</>
          ) : (
            <>£5/mo instead <ArrowRight className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>
      {!showCode ? (
        <button type="button" onClick={() => setShowCode(true)} className="block mt-2 text-xs text-gray-500 hover:text-brand-600 underline">
          Have a discount code? (yearly plan only)
        </button>
      ) : (
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Discount code (yearly plan only)"
          className="mt-2 w-full max-w-[220px] px-2.5 py-1.5 border border-gray-200 rounded-md text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      )}
      {error && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
      )}
    </div>
  )
}
