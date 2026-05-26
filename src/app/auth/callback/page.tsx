'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Logo from '@/components/branding/Logo'

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

    // If the signup flow stashed a premium_intent flag in user
    // metadata, route the now-signed-in user straight to Stripe
    // checkout instead of /account. Clears the flag first so a later
    // login (e.g. cancelled checkout, came back tomorrow) doesn't
    // keep re-launching the same checkout session.
    const goToCheckoutOrNext = async () => {
      if (settled) return
      settled = true
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const meta = user?.user_metadata as { premium_intent?: boolean } | null
        if (meta?.premium_intent) {
          // Clear the flag so future logins don't keep firing checkout.
          await supabase.auth.updateUser({ data: { premium_intent: false } }).catch(() => null)
          const res = await fetch('/api/stripe/subscribe', { method: 'POST' })
          if (res.ok) {
            const json = await res.json() as { url?: string }
            if (json.url) {
              window.location.replace(json.url)
              return
            }
          }
          // Subscribe call failed (already premium, missing price id,
          // network blip). Fall through to /account where the user
          // can hit "Go Premium" manually.
        }
      } catch {
        // Same fall-through.
      }
      router.replace(next)
    }

    // Fire the welcome-email endpoint. The server checks
    // profiles.welcome_sent_at so this is safely idempotent, only the
    // first successful call per user actually sends.
    const fireWelcome = () => {
      fetch('/api/auth/welcome', { method: 'POST' }).catch(() => null)
    }

    // The browser client (with detectSessionInUrl: true and implicit flow)
    // auto-parses the URL fragment / code on mount. Once a session is
    // established it fires SIGNED_IN or PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY')) {
        // Only fire welcome on the actual sign-in event, not on token
        // refresh / password recovery flows.
        if (event === 'SIGNED_IN') fireWelcome()
        void goToCheckoutOrNext()
      }
    })

    // Existing-session shortcut (in case the user is already logged in)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goToCheckoutOrNext()
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
          <Link href="/" aria-label="Jax | Family Travels, home">
            <Logo height={40} />
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
