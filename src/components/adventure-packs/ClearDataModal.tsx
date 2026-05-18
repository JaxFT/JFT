'use client'

import { useState } from 'react'
import { Loader2, X, AlertTriangle } from 'lucide-react'

export default function ClearDataModal({
  open, onCancel, onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => Promise<void> | void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const run = async () => {
    setBusy(true); setError(null)
    try { await onConfirm() } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not clear')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={() => !busy && onCancel()}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-800" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Start again?</h2>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} className="text-gray-400 hover:text-gray-700 p-1 -mr-1 -mt-1" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          This will permanently delete all your answers, ratings and completed missions for this pack. This cannot be undone.
        </p>
        {error && <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-md disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={run} disabled={busy} className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-md disabled:opacity-50">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Clearing…</> : 'Yes, start again'}
          </button>
        </div>
      </div>
    </div>
  )
}
