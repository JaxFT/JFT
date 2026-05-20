'use client'

// Shown to a guest buyer (or any buyer whose session cookies didn't
// survive the Stripe round-trip) after a successful purchase. The
// purchase is already recorded server-side; this just gets them
// signed in so the download endpoint will let them through.
//
// Uses Supabase's standard signInWithOtp (browser-initiated magic
// link email) — same flow as /login, known reliable. We deliberately
// avoid the server-side admin.generateLink + redirect dance because
// it depends on the project's auth flow type matching the browser
// client's, which has a habit of breaking silently.

import { useState } from 'react'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  email: string
  slug: string
}

export default function ClaimPurchasePrompt({ email, slug }: Props) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setState('sending')
    setError(null)
    const supabase = createClient()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(`/guides/${slug}`)}`,
      },
    })
    if (err) {
      setError(err.message)
      setState('error')
      return
    }
    setState('sent')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <p className="text-xs font-bold tracking-widest uppercase text-emerald-800">Payment received</p>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Your guide is ready
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-5">
          We&apos;ve recorded your purchase against <strong>{email}</strong>. Sign in with that
          email to download your offline copy — you only need to do this once, then the
          guide stays in your account forever.
        </p>

        {state === 'sent' ? (
          <div className="bg-white border border-emerald-200 rounded-lg px-4 py-3 text-sm text-gray-700 leading-relaxed">
            <Mail className="w-4 h-4 inline mr-2 text-emerald-700" />
            We&apos;ve sent a sign-in link to <strong>{email}</strong>. Click the link in
            that email to download your guide.
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={send}
              disabled={state === 'sending'}
              className="btn-primary !text-sm disabled:opacity-60"
            >
              {state === 'sending'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Mail className="w-4 h-4" /> Email me a sign-in link</>
              }
            </button>
            {error && (
              <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
