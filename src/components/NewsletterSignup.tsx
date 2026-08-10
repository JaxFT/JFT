'use client'

// Standalone, no-account email capture. Used at the end of blog posts
// and in the footer. Always skippable, never blocks content, submitting
// the form itself is the affirmative consent (no separate checkbox).

import { useState } from 'react'
import { Check, Loader2, Mail } from 'lucide-react'

type Props = {
  source: 'blog_end' | 'footer' | 'quiz_result'
  variant?: 'card' | 'dark'
}

export default function NewsletterSignup({ source, variant = 'card' }: Props) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phase === 'sending' || phase === 'done') return
    setPhase('sending')
    setError('')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const resBody = await res.json().catch(() => ({}))
      if (!res.ok || !resBody.ok) {
        setError(resBody.error ?? 'Could not subscribe right now.')
        setPhase('error')
        return
      }
      setPhase('done')
    } catch {
      setError('Could not reach the server.')
      setPhase('error')
    }
  }

  const dark = variant === 'dark'

  if (phase === 'done') {
    return (
      <div
        className={
          dark
            ? 'flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6'
            : 'flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-6 sm:p-8'
        }
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${dark ? 'bg-white/10' : 'bg-brand-100'}`}>
          <Check className={`w-5 h-5 ${dark ? 'text-white' : 'text-brand-700'}`} />
        </div>
        <p className={`text-sm leading-relaxed ${dark ? 'text-white/80' : 'text-gray-700'}`}>
          You&apos;re subscribed. Look out for new guides and posts in your inbox.
        </p>
      </div>
    )
  }

  return (
    <div
      className={
        dark
          ? 'rounded-2xl border border-white/10 bg-white/5 p-6'
          : 'rounded-2xl border border-brand-100 bg-brand-50 p-6 sm:p-8'
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-1">
          <p className={`font-bold flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
            <Mail className={`w-4 h-4 shrink-0 ${dark ? 'text-white/70' : 'text-brand-600'}`} />
            Get new guides and posts in your inbox
          </p>
          <p className={`text-sm mt-1 ${dark ? 'text-white/60' : 'text-gray-500'}`}>
            No spam, unsubscribe any time.
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 sm:shrink-0">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={
              dark
                ? 'px-3.5 py-2.5 rounded-lg text-sm bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 sm:w-56'
                : 'px-3.5 py-2.5 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent sm:w-56'
            }
          />
          <button
            type="submit"
            disabled={phase === 'sending'}
            className="btn-primary justify-center py-2.5 disabled:opacity-60 shrink-0"
          >
            {phase === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
          </button>
        </form>
      </div>
      {phase === 'error' && (
        <p className={`text-xs mt-3 ${dark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
      )}
    </div>
  )
}
