'use client'

// One-click Premium entry point. Logged-in visitors are taken straight to
// Stripe checkout (priced server-side, so the WayStaq £25 applies when the
// discount cookie is live); logged-out visitors are bounced to signup with
// Premium pre-selected so they sign up and pay in one flow rather than
// signing in and then hunting for a separate "buy Premium" button.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft } from 'lucide-react'
import Logo from '@/components/branding/Logo'

export default function UpgradePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/stripe/subscribe', { method: 'POST' })
        const body = await res.json().catch(() => ({})) as { url?: string; error?: string }
        if (cancelled) return

        // Not signed in → sign up with Premium pre-selected. The signup
        // flow carries premium_intent and auto-launches checkout after
        // email confirmation, keeping it one joined flow.
        if (res.status === 401) {
          router.replace('/signup?plan=premium')
          return
        }
        // Already Premium → nothing to buy, send them to their account.
        if (res.status === 400 && /already have premium/i.test(body.error ?? '')) {
          router.replace('/account')
          return
        }
        if (res.ok && body.url) {
          window.location.replace(body.url)
          return
        }
        throw new Error(body.error || `HTTP ${res.status}`)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not start checkout')
      }
    })()
    return () => { cancelled = true }
  }, [router])

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" aria-label="Jax | Family Travels, home">
            <Logo height={40} />
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          {error ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Couldn&apos;t start checkout</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">{error}</p>
              <Link href="/account" className="btn-primary justify-center w-full">
                <ArrowLeft className="w-4 h-4" /> Go to your account
              </Link>
            </>
          ) : (
            <>
              <Loader2 className="w-7 h-7 animate-spin text-brand-600 mx-auto mb-4" />
              <h1 className="text-lg font-bold text-gray-900 mb-1">Taking you to checkout…</h1>
              <p className="text-sm text-gray-500">Just a moment.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
