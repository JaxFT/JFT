'use client'

// Two-state download CTA:
//  • Not purchased → "Download for offline reading — £X.XX" → opens Stripe checkout
//  • Purchased     → "Download my copy" → hits the download endpoint, which
//                    streams a watermarked self-contained .html file
//
// Free users get bounced to /login (sign in to buy). Premium users see
// the same buy button — download access is sold separately per the
// current pricing decision.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Loader2 } from 'lucide-react'

type Props = {
  slug: string
  // null when the buyer hasn't purchased yet (show buy CTA).
  hasPurchased: boolean
  priceLabel: string
  // The "Download for offline" wording vs "Download my copy" — let the
  // copy match the action. Tone matters at the moment of the click.
  variant?: 'card' | 'inline'
}

export default function DownloadButton({ slug, hasPurchased, priceLabel, variant = 'card' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')

  const buy = async () => {
    setError(null)
    setLoading(true)
    try {
      const trimmedCode = code.trim()
      const res = await fetch('/api/stripe/checkout-web-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...(trimmedCode ? { code: trimmedCode } : {}) }),
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

  if (hasPurchased) {
    return (
      <a
        href={`/api/web-guides/${slug}/download`}
        className={variant === 'card'
          ? 'btn-primary w-full justify-center'
          : 'inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-md'}
      >
        <Download className="w-4 h-4" /> Download my copy
      </a>
    )
  }

  return (
    <div className="space-y-2.5">
      <button
        onClick={buy}
        disabled={loading}
        className={variant === 'card'
          ? 'btn-primary w-full justify-center disabled:opacity-60'
          : 'inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 px-4 py-2 rounded-md'}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Opening Stripe…</>
        ) : (
          <><Download className="w-4 h-4" /> Download for offline reading — {priceLabel}</>
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
