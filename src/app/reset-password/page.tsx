'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
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
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Send users straight to /update-password, that page handles the
      // PASSWORD_RECOVERY auth event itself, which is the canonical
      // Supabase pattern and sidesteps query-param mangling on redirectTo.
      const redirectTo = `${window.location.origin}/update-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw new Error(error.message)
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send reset email')
    } finally {
      setLoading(false)
    }
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
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-brand-700" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link. Open it on this device and you'll be taken to set a new password.
              </p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 mt-6">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot password</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a link to set a new one.</p>

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
                  {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>) : 'Send reset link'}
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
