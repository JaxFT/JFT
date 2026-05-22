'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, X, AlertTriangle } from 'lucide-react'

// "Type DELETE to confirm" dialog + POST to /api/account/delete.
// On success we hard-redirect to the homepage so any cached auth
// state in the navbar is cleared.
export default function DeleteAccountButton({ hasActiveSubscription }: { hasActiveSubscription: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    if (busy) return
    setOpen(false)
    setConfirmText('')
    setError(null)
  }

  const onConfirm = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      // Force a full reload of the home page so navbar / RSC caches
      // refresh as an unauthenticated visitor.
      window.location.href = '/?account-deleted=1'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete account')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="font-bold text-gray-900">Delete account</h2>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Permanently deletes your account, your purchases, every child profile, all of their stamps, journals,
          and country visits. <strong>This cannot be undone.</strong>
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-md"
        >
          <Trash2 className="w-4 h-4" /> Delete my account and all data
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={close}
              disabled={busy}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1 disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-gray-900">Delete account?</h2>
            </div>
            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
              We&apos;ll permanently remove your profile, purchases, every child, every stamp, every journal entry
              and every country visit. <strong>There is no undo.</strong>
            </p>
            {hasActiveSubscription && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3 leading-relaxed">
                You currently have an active subscription. Cancel it first under <em>Manage billing</em> above —
                otherwise Stripe will keep trying to bill you until it gives up.
              </p>
            )}
            <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              disabled={busy}
              autoFocus
              placeholder="DELETE"
              className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
            />
            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3">{error}</p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy || confirmText !== 'DELETE'}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md disabled:opacity-50"
              >
                {busy
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                  : <><Trash2 className="w-4 h-4" /> Delete forever</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
