'use client'

// "Assign to passport" CTA on each pack card on /adventure-packs.
// Saves the parent from navigating to /family and assigning manually.
//
// Behaviour:
//   - 1 child → tap fires the assignment immediately.
//   - 2+ children → pops a small picker (multi-select) so the parent
//     can spray a pack onto several kids at once.
//   - Per-pack assignments are read at SSR time and passed in via
//     `alreadyAssignedIds`. The component disables already-assigned
//     kids in the picker (they keep a tick); for a one-child user
//     who's already assigned, the button just labels as "Assigned"
//     and stops being interactive.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Stamp, X } from 'lucide-react'

type Child = { id: string; name: string; avatar: string }

type Props = {
  slug: string
  countryName: string
  children: Child[]
  alreadyAssignedIds: string[]
}

export default function AssignPackButton({ slug, countryName, children, alreadyAssignedIds }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Local set of "now assigned" ids so the UI updates immediately
  // after a successful call; SSR-passed alreadyAssignedIds is the
  // initial seed.
  const [assignedIds, setAssignedIds] = useState<Set<string>>(() => new Set(alreadyAssignedIds))

  const everyChildAssigned = children.length > 0 && children.every(c => assignedIds.has(c.id))

  if (children.length === 0) return null  // parent has no kids yet

  // ── ONE-CHILD FAST PATH ───────────────────────────────────────────
  // If they only have one kid, skip the modal: tap = assign.
  if (children.length === 1) {
    const only = children[0]
    const isAssigned = assignedIds.has(only.id)

    const assign = async () => {
      if (isAssigned || submitting) return
      setSubmitting(true)
      setError(null)
      try {
        const res = await fetch(`/api/family/children/${only.id}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country_slug: slug }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
        setAssignedIds(prev => new Set(prev).add(only.id))
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not assign')
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <>
        <button
          type="button"
          onClick={assign}
          disabled={isAssigned || submitting}
          className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition-colors ${
            isAssigned
              ? 'text-emerald-800 bg-emerald-50 border border-emerald-200 cursor-default'
              : 'text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100'
          } disabled:opacity-60`}
          title={isAssigned ? `Already assigned to ${only.name}` : `Assign ${countryName} to ${only.name}`}
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : isAssigned ? <Check className="w-3.5 h-3.5" />
            : <Stamp className="w-3.5 h-3.5" />}
          {isAssigned ? `Assigned to ${only.name}` : `Assign to ${only.name}`}
        </button>
        {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
      </>
    )
  }

  // ── MULTI-CHILD PICKER ────────────────────────────────────────────
  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError(null) }}
        className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md transition-colors ${
          everyChildAssigned
            ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
            : 'text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100'
        }`}
      >
        {everyChildAssigned
          ? <><Check className="w-3.5 h-3.5" /> Assigned to all kids</>
          : <><Stamp className="w-3.5 h-3.5" /> Assign to passport</>}
      </button>

      {open && (
        <ChildPickerModal
          slug={slug}
          countryName={countryName}
          children={children}
          assignedIds={assignedIds}
          submitting={submitting}
          error={error}
          onClose={() => setOpen(false)}
          onAssign={async (ids) => {
            if (ids.length === 0) { setOpen(false); return }
            setSubmitting(true)
            setError(null)
            try {
              // Fire all assignments in parallel. The endpoint is
              // idempotent via the (child_id, country_slug) primary
              // key, so retrying never duplicates.
              const results = await Promise.all(
                ids.map(id => fetch(`/api/family/children/${id}/assignments`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ country_slug: slug }),
                }).then(r => r.ok)),
              )
              if (results.some(ok => !ok)) {
                throw new Error('One or more assignments failed; please try again.')
              }
              setAssignedIds(prev => {
                const next = new Set(prev)
                for (const id of ids) next.add(id)
                return next
              })
              setOpen(false)
              router.refresh()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not assign')
            } finally {
              setSubmitting(false)
            }
          }}
        />
      )}
    </>
  )
}

function ChildPickerModal({
  slug: _slug, countryName, children, assignedIds, submitting, error, onClose, onAssign,
}: {
  slug: string
  countryName: string
  children: Child[]
  assignedIds: Set<string>
  submitting: boolean
  error: string | null
  onClose: () => void
  onAssign: (ids: string[]) => Promise<void> | void
}) {
  // Default selection: any kid who doesn't already have it.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(children.filter(c => !assignedIds.has(c.id)).map(c => c.id)),
  )
  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toAssign = Array.from(selected).filter(id => !assignedIds.has(id))

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Assign ${countryName} pack`}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3 gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">Assign pack</p>
            <h2 className="text-lg font-bold text-gray-900">{countryName} Adventure Pack</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pick which kids should get this pack in their passport.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 -mt-1 -mr-1 p-2"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="space-y-1.5 mb-4">
          {children.map(c => {
            const alreadyHas = assignedIds.has(c.id)
            const isSelected = selected.has(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => !alreadyHas && toggle(c.id)}
                  disabled={alreadyHas || submitting}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    alreadyHas
                      ? 'bg-emerald-50 border-emerald-100 cursor-default'
                      : isSelected
                        ? 'bg-brand-50 border-brand-300'
                        : 'bg-white border-gray-200 hover:border-brand-200'
                  } disabled:cursor-not-allowed`}
                >
                  <span className="text-2xl leading-none shrink-0" aria-hidden>{c.avatar}</span>
                  <span className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {alreadyHas ? 'Already has this pack' : isSelected ? 'Will be assigned' : 'Tap to select'}
                    </p>
                  </span>
                  {alreadyHas
                    ? <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    : isSelected
                      ? <div className="w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>
                      : <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-3">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onAssign(toAssign)}
            disabled={submitting || toAssign.length === 0}
            className="btn-primary !text-sm !py-2 !px-4 disabled:opacity-50"
          >
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Assigning…</>
              : toAssign.length === 0
                ? 'Nothing to assign'
                : `Assign to ${toAssign.length} ${toAssign.length === 1 ? 'kid' : 'kids'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
