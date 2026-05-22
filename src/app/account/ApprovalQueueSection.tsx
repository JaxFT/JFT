'use client'

// Suggested stamps waiting for parent approval. Renders only when
// at least one child in the family has a suggestion in flight.
//
// Approve → stamp lands as 'awarded' on the kid's passport.
// Reject → stamp marked 'rejected'; the kid doesn't see it.
//
// Server-component wrapper passes in the already-loaded list of
// suggestions (with the child's name baked in) so the client
// component stays lean.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, X, Loader2 } from 'lucide-react'
import { effectiveStampMeta, PassportStampFromRow } from '@/components/passport/PassportStamp'
import { getPackMeta } from '@/lib/adventurePackMeta'
import type { StampType, StampStatus } from '@/lib/passport-types'

export type SuggestionRow = {
  id: string
  child_id: string
  child_name: string
  child_avatar: string
  type: StampType
  country_slug: string | null
  note: string | null
  awarded_by: 'system' | 'parent' | 'self'
  status: StampStatus
  earned_at: string
  custom_label: string | null
  custom_emoji: string | null
  custom_shape: string | null
  custom_ink: string | null
}

export default function ApprovalQueueSection({ initialQueue }: { initialQueue: SuggestionRow[] }) {
  const router = useRouter()
  const [queue, setQueue] = useState<SuggestionRow[]>(initialQueue)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (queue.length === 0) return null

  const decide = async (row: SuggestionRow, status: 'awarded' | 'rejected') => {
    setBusyId(row.id)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${row.child_id}/stamps/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setQueue(prev => prev.filter(q => q.id !== row.id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update stamp')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-700" />
        <h2 className="text-lg font-bold text-amber-900">
          {queue.length} suggested stamp{queue.length === 1 ? '' : 's'} waiting for you
        </h2>
      </div>
      <p className="text-sm text-amber-800/80 mb-4">
        Your kids have suggested these themselves. Approve to add to their passport, or reject to skip.
      </p>

      <ul className="space-y-3">
        {queue.map(row => {
          const meta = effectiveStampMeta(row)
          const country = row.country_slug ? getPackMeta(row.country_slug)?.country ?? null : null
          const isBusy = busyId === row.id
          return (
            <li key={row.id} className="bg-white rounded-xl p-4 flex items-center gap-4">
              <div className="shrink-0">
                <PassportStampFromRow row={row} country={country} date={row.earned_at} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 inline-flex items-center gap-1.5">
                  <span aria-hidden>{row.child_avatar}</span>
                  {row.child_name}
                  <span className="text-gray-400">·</span>
                  {meta.label}
                </p>
                {country && (
                  <p className="text-xs text-gray-500 mt-0.5">{country}</p>
                )}
                {row.note && (
                  <p className="text-sm text-gray-700 mt-1.5 italic">&ldquo;{row.note}&rdquo;</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => decide(row, 'awarded')}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1.5 rounded-md disabled:opacity-50"
                  aria-label="Approve"
                >
                  {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => decide(row, 'rejected')}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-red-600 border border-gray-200 px-2.5 py-1.5 rounded-md disabled:opacity-50"
                  aria-label="Reject"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">{error}</p>
      )}
    </section>
  )
}
