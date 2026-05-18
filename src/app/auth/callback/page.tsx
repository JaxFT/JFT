'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Plane } from 'lucide-react'

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand-50" />}>
      <AuthCallbackHandler />
    </Suspense>
  )
}

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // 'working' = supabase-js is still processing the URL fragment / code.
  // 'failed'  = no session was established within the timeout window.
  const [state, setState] = useState<'working' | 'failed'>('working')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const next = searchParams.get('next') ?? '/account'
  const errorDescription = searchParams.get('error_description')

  useEffect(() => {
    // If Supabase sent us back with an explicit error (e.g. expired token,
    // unauthorized redirect), surface it immediately.
    if (errorDescription) {
      setErrorMessage(errorDescription)
      setState('failed')
      return
    }

    let settled = false
    const goToNext = () => {
      if (settled) return
      settled = true
      router.replace(next)
    }

    // Fire the welcome-email endpoint. The server checks
    // profiles.welcome_sent_at so this is safely idempotent — only the
    // first successful call per user actually sends.
    const fireWelcome = () => {
      fetch('/api/auth/welcome', { method: 'POST' }).catch(() => null)
    }

    // The browser client (with detectSessionInUrl: true and implicit flow)
    // auto-parses the URL fragment / code on mount. Once a session is
    // established it fires SIGNED_IN or PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY')) {
        // Only fire welcome on the actual sign-in event — not on token
        // refresh / password recovery flows.
        if (event === 'SIGNED_IN') fireWelcome()
        goToNext()
      }
    })

    // Existing-session shortcut (in case the user is already logged in)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goToNext()
    })

    // Give the URL-parsing a few seconds before declaring failure
    const timeoutId = setTimeout(() => {
      if (!settled) {
        setErrorMessage('We could not verify the link. It may have expired or been used already.')
        setState('failed')
      }
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [errorDescription, next, router, supabase.auth])

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-wide text-sm uppercase">Jax Family Travels</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          {state === 'working' ? (
            <>
              <Loader2 className="w-7 h-7 animate-spin text-brand-600 mx-auto mb-4" />
              <h1 className="text-lg font-bold text-gray-900 mb-1">Signing you in…</h1>
              <p className="text-sm text-gray-500">Just a moment.</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Link couldn't be verified</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                {errorMessage ?? 'The reset or confirmation link is no longer valid.'}
              </p>
              <Link href="/login" className="btn-primary justify-center w-full">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
