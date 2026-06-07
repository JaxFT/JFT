'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Check, Crown, Loader2 } from 'lucide-react'
import Logo from '@/components/branding/Logo'
import { titleCaseName } from '@/lib/format-name'

type Tier = 'free' | 'premium'

// discountEmail is resolved server-side in page.tsx from the WayStaq
// discount cookie (the email it was verified for, or null). When present
// the Premium option shows the £25 member price and we pre-fill that
// email, because the £25 only applies in /api/stripe/subscribe when the
// account email matches it. So the figure shown here matches what they pay
// as long as they keep the pre-filled email.
export default function SignupForm({
  discountEmail = null,
  defaultTier = 'free',
}: {
  discountEmail?: string | null
  defaultTier?: Tier
}) {
  const discountActive = !!discountEmail
  const [email, setEmail] = useState(discountEmail ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  // Unticked by default, UK GDPR/PECR requires affirmative consent.
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  // 'free' goes to /account after confirm; 'premium' carries a
  // premium_intent flag in user_metadata that we read after the code
  // is verified and turn into a Stripe checkout redirect.
  const [tier, setTier] = useState<Tier>(defaultTier)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // 'form' = filling details, 'otp' = entering the 6-digit email code.
  const [phase, setPhase] = useState<'form' | 'otp'>('form')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resent, setResent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const normalisedName = titleCaseName(fullName)
    // Reflect the corrected version in the field so the user sees what
    // got saved if anything fails downstream.
    if (normalisedName !== fullName) setFullName(normalisedName)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        // marketing_opt_in + premium_intent ride in user metadata
        // until the user confirms. The welcome endpoint syncs
        // marketing_opt_in to the profiles row, and we read
        // premium_intent after verification to route to Stripe.
        data: {
          full_name: normalisedName,
          marketing_opt_in: marketingOptIn,
          premium_intent: tier === 'premium',
        },
        // Fallback link target if they click the email link instead of
        // entering the code. The code (verifyOtp) is the primary path.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
      },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false)
    setPhase('otp')
  }

  // After the code verifies the user is signed in. Fire the welcome
  // email, then route premium intents to Stripe checkout, everyone else
  // to their account. Mirrors the link-based /auth/callback logic.
  const finishSignIn = async () => {
    fetch('/api/auth/welcome', { method: 'POST' }).catch(() => null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata as { premium_intent?: boolean } | null
      if (meta?.premium_intent) {
        await supabase.auth.updateUser({ data: { premium_intent: false } }).catch(() => null)
        const res = await fetch('/api/stripe/subscribe', { method: 'POST' })
        if (res.ok) {
          const json = await res.json() as { url?: string }
          if (json.url) { window.location.replace(json.url); return }
        }
        // Fall through to /account if checkout couldn't start.
      }
    } catch {
      // Fall through.
    }
    router.replace('/account')
    router.refresh()
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifying(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'signup',
    })
    if (error) {
      setError(error.message || 'That code was not valid. Check it and try again.')
      setVerifying(false)
      return
    }
    await finishSignIn()
  }

  const handleResend = async () => {
    setError('')
    setResent(false)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) { setError(error.message); return }
    setResent(true)
  }

  // ── CODE ENTRY STEP ──
  if (phase === 'otp') return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" aria-label="Jax | Family Travels, home">
            <Logo height={40} />
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-brand-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Enter your code</h1>
          <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
            We emailed a 6-digit code to <strong>{email}</strong>. Pop it in below to activate your account
            {tier === 'premium' ? ' and start Premium checkout.' : '.'}
          </p>
          <form onSubmit={handleVerify} className="space-y-4">
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
              {verifying ? (<><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>) : 'Activate account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Didn&apos;t get it?{' '}
            <button type="button" onClick={handleResend} className="text-brand-600 font-semibold hover:underline">Resend code</button>
          </p>
        </div>
      </div>
    </div>
  )

  // ── DETAILS FORM ──
  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" aria-label="Jax | Family Travels, home">
            <Logo height={40} />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">
            {discountActive
              ? 'Free to join, or go Premium for £25/year, your WayStaq member price.'
              : 'Free to join, premium access from £49.99/year'}
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Tier choice — sits at the top so it's the first
                decision a signing-up visitor makes. Picking Premium
                doesn't charge anything yet; it just routes them
                through Stripe checkout after they confirm their email. */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTier('free')}
                  aria-pressed={tier === 'free'}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    tier === 'free'
                      ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-900">Free account</p>
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">Full France Adventure Pack, like and comment on every post.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setTier('premium')}
                  aria-pressed={tier === 'premium'}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    tier === 'premium'
                      ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-900 inline-flex items-center gap-1 flex-wrap">
                    <Crown className="w-3.5 h-3.5 text-brand-600" /> Premium{' '}
                    {discountActive ? (
                      <span className="font-normal">
                        <span className="line-through text-gray-400">£49.99</span>{' '}
                        <span className="text-brand-700 font-semibold">£25/yr</span>
                      </span>
                    ) : (
                      <span className="font-normal text-gray-500">£49.99/yr</span>
                    )}
                  </p>
                  {discountActive && (
                    <p className="text-[11px] font-semibold text-brand-700 mt-0.5">WayStaq member price</p>
                  )}
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">All 80+ Adventure Packs, the Adventure Passport, every premium blog and guide.</p>
                </button>
              </div>
              {tier === 'premium' && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  You&apos;ll confirm your email with a code, then land on Stripe checkout to start your Premium membership
                  {discountActive ? ' at the £25 member price.' : '.'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input
                type="text" required value={fullName}
                onChange={e => setFullName(e.target.value)}
                onBlur={e => setFullName(titleCaseName(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="you@example.com"
              />
              {discountActive && (
                <p className="text-xs text-brand-700 mt-1.5 leading-relaxed">
                  Keep this email to get your £25 WayStaq member price. A different email signs up at the standard £49.99.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input
                type="password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                  confirmPassword && confirmPassword !== password ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="Re-enter your password"
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-600 mt-1.5">Passwords do not match.</p>
              )}
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

            <p className="text-xs text-gray-400 leading-relaxed">
              By creating an account you agree to our{' '}
              <Link href="/terms" target="_blank" className="text-brand-600 hover:underline">Terms</Link>{' '}and{' '}
              <Link href="/privacy" target="_blank" className="text-brand-600 hover:underline">Privacy Policy</Link>.
            </p>

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 disabled:opacity-60">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
