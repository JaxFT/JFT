'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Logo from '@/components/branding/Logo'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand-50" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 'form' = enter email, 'otp' = enter the 6-digit reset code.
  const [phase, setPhase] = useState<'form' | 'otp'>('form')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resent, setResent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // We send a 6-digit code (the email template includes {{ .Token }}).
      // redirectTo is kept as a fallback for anyone who clicks the link.
      const redirectTo = `${window.location.origin}/update-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw new Error(error.message)
      setPhase('otp')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    })
    if (error) {
      setError(error.message || 'That code was not valid. Check it and try again.')
      setVerifying(false)
      return
    }
    // Recovery session is now active; the update-password page lets them
    // set a new one.
    router.replace('/update-password')
  }

  const resend = async () => {
    setError(null)
    setResent(false)
    const redirectTo = `${window.location.origin}/update-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) { setError(error.message); return }
    setResent(true)
  }

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" aria-label="Jax | Family Travels, home">
            <Logo height={40} />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {phase === 'otp' ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Enter your code</h1>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                If an account exists for <strong>{email}</strong>, we&apos;ve emailed a 6-digit code.
                Enter it below to set a new password.
              </p>

              <form onSubmit={verify} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  autoFocus
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-3.5 py-3 border border-gray-200 rounded-lg text-center text-lg tracking-[0.4em] font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                {resent && <p className="text-sm text-brand-700 bg-brand-50 px-3 py-2 rounded-lg">New code sent.</p>}
                <button type="submit" disabled={verifying || code.length < 6} className="btn-primary w-full justify-center py-2.5 disabled:opacity-60">
                  {verifying ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>) : 'Continue'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Didn&apos;t get it?{' '}
                <button type="button" onClick={resend} className="text-brand-600 font-semibold hover:underline">Resend code</button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot password</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we&apos;ll send you a 6-digit code to set a new one.</p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5 disabled:opacity-60"
                >
                  {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>) : 'Send reset code'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                <Link href="/login" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                  <ArrowLeft className="w-3 h-3" /> Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
