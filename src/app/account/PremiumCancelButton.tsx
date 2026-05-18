'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, X } from 'lucide-react'

export default function PremiumCancelButton() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { error: e } = await supabase
        .from('profiles')
        .update({ cancellation_requested_at: new Date().toISOString() })
        .eq('id', user.id)
      if (e) throw new Error(e.message)
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError(null) }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-md shrink-0"
      >
        Cancel premium
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900">Cancel premium?</h2>
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                className="text-gray-400 hover:text-gray-700 -mr-2 -mt-2 p-2"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                Your premium access will continue until the <strong>end of your current paid period</strong>, typically the end of the 12-month subscription you paid for. No refund is due for the remainder of that period.
              </p>
              <p>
                After that, you&apos;ll lose access to premium blog posts, guides, and adventure packs. Your account stays put, you can re-subscribe any time.
              </p>
              <p className="text-xs text-gray-500">
                If you want a refund, please email <a href="mailto:hello@jaxfamilytravels.com" className="text-brand-600 underline">hello@jaxfamilytravels.com</a> with the reason. We consider requests case by case.
              </p>
            </div>
            {error && (
              <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
            )}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="inline-flex items-center justify-center text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-md disabled:opacity-50"
              >
                Keep my membership
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-md disabled:opacity-50"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</>
                  : 'Yes, cancel premium'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
