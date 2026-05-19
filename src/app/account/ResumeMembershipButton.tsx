'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Loader2 } from 'lucide-react'

export default function ResumeMembershipButton() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resume = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/resume', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resume')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={resume}
        disabled={submitting}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-white border border-brand-300/40 hover:border-brand-300 px-3 py-1.5 rounded-md shrink-0 disabled:opacity-60"
      >
        {submitting
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resuming…</>
          : <><Crown className="w-3.5 h-3.5" /> Resume membership</>}
      </button>
      {error && (
        <p className="text-xs text-red-200 bg-red-950/30 border border-red-700/40 rounded-md px-3 py-2">{error}</p>
      )}
    </div>
  )
}
