'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react'

export default function DeleteChildButton({
  childId,
  childName,
}: {
  childId: string
  childName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      router.push('/family')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete')
      setDeleting(false)
    }
  }

  return (
    <>
      <section className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-red-50 text-red-700 rounded-lg p-2 shrink-0">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Delete this child</h2>
            <p className="text-sm text-gray-500 mt-1">
              Permanently remove {childName} and everything they&apos;ve collected: stamps, journal entries, pack progress, country visits. This cannot be undone.
            </p>
          </div>
        </div>
        <button
          onClick={() => { setOpen(true); setError(null); setConfirmText('') }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-md"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete {childName}…
        </button>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          onClick={() => !deleting && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">Delete {childName}?</h2>
              </div>
              <button
                onClick={() => !deleting && setOpen(false)}
                className="text-gray-400 hover:text-gray-700 -mr-2 -mt-2 p-2"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                This will permanently delete <strong>{childName}</strong> and every memory connected to them: stamps,
                journal entries, completed packs, country pages, QR access.
              </p>
              <p className="text-xs text-gray-500">
                Type <strong>{childName}</strong> below to confirm.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={childName}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            {error && (
              <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
            )}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="inline-flex items-center justify-center text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                disabled={deleting || confirmText !== childName}
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-md disabled:opacity-50"
              >
                {deleting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                  : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
