'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, XCircle, Mail } from 'lucide-react'

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand-50" />}>
      <Handler />
    </Suspense>
  )
}

function Handler() {
  const params = useSearchParams()
  const token = params.get('t')
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setState('error')
      setError('This unsubscribe link is missing its token.')
      return
    }
    fetch(`/api/marketing/unsubscribe?t=${encodeURIComponent(token)}`)
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (r.ok && body.ok) {
          setState('ok')
        } else {
          setError(body.error ?? `HTTP ${r.status}`)
          setState('error')
        }
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : 'Could not reach the server')
        setState('error')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          {state === 'working' && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-1">Unsubscribing…</h1>
              <p className="text-sm text-gray-500">Just a moment.</p>
            </>
          )}

          {state === 'ok' && (
            <>
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-brand-700" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re unsubscribed</h1>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                We won&apos;t send you any more marketing emails. You&apos;ll still get account-related messages when needed (login confirmations, purchase receipts, replies to anything you ask us).
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Changed your mind? You can turn marketing emails back on any time from your account.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link href="/account" className="btn-primary !py-2.5 !px-5 !text-sm justify-center">
                  Go to account
                </Link>
                <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 py-2.5 px-5">
                  Back home
                </Link>
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-red-700" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Couldn&apos;t unsubscribe</h1>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">{error}</p>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                You can also turn marketing emails off from your account page, or email us and we&apos;ll do it manually.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link href="/account" className="btn-primary !py-2.5 !px-5 !text-sm justify-center">
                  Go to account
                </Link>
                <a
                  href="mailto:hello@jaxfamilytravels.com?subject=Unsubscribe me"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 py-2.5 px-5 rounded-md"
                >
                  <Mail className="w-4 h-4" /> Email us
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
