'use client'

// Pops open when the iframe postMessages a "user wants their result
// emailed" event. Two variants:
//   - Logged in:  one-tap "Send to <your-email>" confirmation.
//   - Logged out: small free-signup form (name, email, password, marketing
//                 opt-in unticked) that mirrors /signup. On submit it
//                 supabase.auth.signUp's client-side (so the normal
//                 email-confirmation flow runs and marketing_opt_in syncs
//                 via /api/auth/welcome) and then POSTs the result to
//                 /api/family-way/email-result for the transactional send.
//
// The result email itself is transactional (triggered by their explicit
// click), so it sends regardless of the marketing opt-in. The opt-in
// governs future nurture emails only.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { titleCaseName } from '@/lib/format-name'
import { X, Check, Loader2 } from 'lucide-react'

type Result = {
  score: number
  band: string
  tagline: string
  style: string
  familyDesc: string
  paceText: string
  strengths: string[]
  challenges: string[]
  actions: string[]
  nextStep: { title: string; body: string }
}

type Props = {
  initialUser: { id: string; email: string } | null
}

export default function EmailResultModal({ initialUser }: Props) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [phase, setPhase] = useState<'form' | 'sending' | 'success'>('form')
  const [errorMsg, setErrorMsg] = useState('')

  // Signup form state (only used when initialUser is null).
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data
      if (!data || typeof data !== 'object') return
      if (data.type !== 'jft.family-way.email-request') return
      setResult(data.result ?? null)
      setOpen(true)
      setPhase('form')
      setErrorMsg('')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const close = () => {
    setOpen(false)
    // Reset the form so a second click on the iframe button gets a fresh
    // modal rather than leftover state.
    setErrorMsg('')
    setPhase('form')
  }

  const sendResultEmail = async (toEmail: string, name: string | null) => {
    if (!result) return false
    const res = await fetch('/api/family-way/email-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: toEmail, name, result }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error || `HTTP ${res.status}`)
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setPhase('sending')

    try {
      if (initialUser) {
        await sendResultEmail(initialUser.email, null)
        setPhase('success')
        return
      }

      // Logged out: sign up first, then send the result email.
      const normName = titleCaseName(fullName)
      if (normName !== fullName) setFullName(normName)

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: normName,
            marketing_opt_in: marketingOptIn,
            premium_intent: false,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        },
      })
      if (error) {
        throw new Error(error.message)
      }

      await sendResultEmail(email, normName)
      setPhase('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('form')
    }
  }

  if (!open) return null

  const recipientForSuccess = initialUser?.email ?? email

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-result-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 id="email-result-title" className="text-lg font-bold text-gray-900">
            {phase === 'success'
              ? "Sent, check your inbox"
              : initialUser
                ? 'Email me my result'
                : 'Email me my result, sign up free'}
          </h2>
          <button
            type="button"
            onClick={close}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5">
          {phase === 'success' ? (
            <div className="text-sm text-gray-700">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-center mb-2">
                Your result is on its way to{' '}
                <strong className="text-gray-900">{recipientForSuccess}</strong>.
              </p>
              {!initialUser && (
                <p className="text-center text-xs text-gray-500 leading-relaxed mb-4">
                  We also sent a separate confirmation link to activate your new account. Click it to finish signing in.
                </p>
              )}
              <button
                type="button"
                onClick={close}
                className="btn-primary w-full justify-center py-2.5"
              >
                Done
              </button>
            </div>
          ) : initialUser ? (
            // Logged in path: one-tap confirm.
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <p className="text-gray-700 leading-relaxed">
                We'll email your result to{' '}
                <strong className="text-gray-900">{initialUser.email}</strong>.
              </p>
              {errorMsg && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={phase === 'sending'}
                className="btn-primary w-full justify-center py-2.5 disabled:opacity-60"
              >
                {phase === 'sending' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : 'Send my result'}
              </button>
            </form>
          ) : (
            // Logged out path: free signup + send.
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <p className="text-gray-600 leading-relaxed mb-1">
                Free account, no card. We'll email your result and keep it in your account so you can come back to it.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
                <input
                  type="text" required value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onBlur={e => setFullName(titleCaseName(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password" required minLength={8} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Min. 8 characters"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={e => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 shrink-0"
                />
                <span className="text-xs text-gray-600 leading-relaxed">
                  Yes, I&apos;d be happy to hear from Jax | Family Travels, occasional emails when we release new guides, post on the blog, or have updates worth sharing. No spam, ever, and you can unsubscribe in one click any time.
                </span>
              </label>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Your result email goes regardless. The tick above only governs future updates from us.
              </p>

              {errorMsg && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={phase === 'sending'}
                className="btn-primary w-full justify-center py-2.5 disabled:opacity-60"
              >
                {phase === 'sending' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating account & sending…</>
                ) : 'Create account & email my result'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
