'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2, Plane } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Two paths set hasSession=true:
    // 1. PASSWORD_RECOVERY event fires when the user arrives from the reset
    //    email link — the supabase-js browser client picks up the auth params
    //    on load (whether in ?code= or in the URL fragment) and emits this.
    // 2. The user is already signed in (e.g. they navigated here from
    //    /account to set a new password while logged in).
    let resolved = false
    const settle = (ok: boolean) => {
      if (resolved) return
      resolved = true
      setHasSession(ok)
      setCheckingSession(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED'))) {
        settle(true)
      }
    })

    // Fallback: if no auth-state event fires within ~2s and there's no
    // existing session, the link was expired or invalid.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) settle(true)
    })
    const timeoutId = setTimeout(() => settle(false), 2500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [supabase.auth])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
      if (newPassword !== confirm) throw new Error('Passwords do not match')

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message)

      setSuccess(true)
      setTimeout(() => router.push('/account'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update password')
      setSubmitting(false)
    }
  }

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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {checkingSession ? (
            <div className="text-center py-6 text-gray-500 text-sm inline-flex items-center gap-2 justify-center w-full">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking your reset link…
            </div>
          ) : !hasSession ? (
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Reset link expired</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                This password reset link is no longer valid. Request a new one and try again.
              </p>
              <Link href="/reset-password" className="btn-primary justify-center w-full">
                Request a new link
              </Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-brand-700" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated</h1>
              <p className="text-sm text-gray-500">Taking you to your account…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a new password</h1>
              <p className="text-sm text-gray-500 mb-6">Pick something at least 8 characters.</p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    placeholder="At least 8 characters"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full justify-center py-2.5 disabled:opacity-60"
                >
                  {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>) : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
