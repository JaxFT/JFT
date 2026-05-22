'use client'

// Family-level "delete a passport" picker on /account. Lists every
// child as a row; clicking opens a confirm modal scoped to that
// child. Hidden when the family has no children (nothing to delete).
//
// The actual DELETE goes to the existing per-child endpoint; this
// component is just a multi-child entry point.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react'

type ChildLite = { id: string; name: string; avatar: string }

export default function DeletePassportSection({
  children: childrenList,
}: {
  children: ChildLite[]
}) {
  const router = useRouter()
  const [target, setTarget] = useState<ChildLite | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (childrenList.length === 0) return null

  const close = () => { setTarget(null); setConfirmText(''); setError(null) }

  const remove = async () => {
    if (!target) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${target.id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      close()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete')
      setDeleting(false)
    }
  }

  const confirmMatch = target && confirmText.trim() === target.name

  return (
    <section className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <Trash2 className="w-5 h-5 text-red-600" />
        <h2 className="text-lg font-bold text-gray-900">Delete a passport</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Removes a child completely: their stamps, journal entries, QR token and pack progress all go with them.
        Country visits and home country stay on the family.
      </p>

      <ul className="divide-y divide-gray-100">
        {childrenList.map(c => (
          <li key={c.id} className="flex items-center gap-3 py-2.5">
            <span className="text-2xl leading-none" aria-hidden>{c.avatar}</span>
            <span className="font-semibold text-gray-900 flex-1 min-w-0 truncate">{c.name}</span>
            <button
              type="button"
              onClick={() => setTarget(c)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-md"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </li>
        ))}
      </ul>

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={close}
              disabled={deleting}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1 disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-gray-900">Delete {target.name}&apos;s passport?</h2>
            </div>
            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
              This permanently removes {target.name}&apos;s passport, including every stamp, journal entry, QR token
              and pack progress. <strong>There is no undo.</strong>
            </p>
            <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">
              Type the child&apos;s name to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={target.name}
              disabled={deleting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-3">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={close}
                disabled={deleting}
                className="text-sm font-semibold text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={!confirmMatch || deleting}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md disabled:opacity-50"
              >
                {deleting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                  : <><Trash2 className="w-4 h-4" /> Delete passport</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
