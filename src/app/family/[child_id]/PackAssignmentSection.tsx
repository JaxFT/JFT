'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass, Plus, X, Loader2, Crown, Lock } from 'lucide-react'

type PackMetaLite = {
  slug: string
  country: string
  flag: string
  status: 'live' | 'coming-soon'
}

export default function PackAssignmentSection({
  childId,
  initialAssigned,
  allPacks,
}: {
  childId: string
  initialAssigned: string[]
  allPacks: PackMetaLite[]
}) {
  const router = useRouter()
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initialAssigned))
  const [busy, setBusy] = useState<string | null>(null) // slug currently mutating
  const [error, setError] = useState<string | null>(null)

  // Two lists: the ones already assigned (shown as removable chips at
  // the top), and the available ones (live packs only — coming-soon
  // packs aren't assignable yet).
  const assignedPacks = useMemo(
    () => allPacks.filter(p => assigned.has(p.slug)),
    [allPacks, assigned],
  )
  const unassignedLivePacks = useMemo(
    () => allPacks.filter(p => p.status === 'live' && !assigned.has(p.slug)),
    [allPacks, assigned],
  )

  const assign = async (slug: string) => {
    setBusy(slug)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_slug: slug }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setAssigned(prev => new Set(prev).add(slug))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign pack')
    } finally {
      setBusy(null)
    }
  }

  const unassign = async (slug: string) => {
    setBusy(slug)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/assignments/${slug}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setAssigned(prev => {
        const next = new Set(prev)
        next.delete(slug)
        return next
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unassign pack')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Adventure Packs</h2>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        Pick which packs this child can use. Different kids in the family can have different packs.
      </p>

      {/* Assigned */}
      {assignedPacks.length > 0 ? (
        <div className="mb-5">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Assigned ({assignedPacks.length})</p>
          <div className="flex flex-wrap gap-2">
            {assignedPacks.map(p => (
              <div
                key={p.slug}
                className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-900 rounded-full pl-2.5 pr-1.5 py-1 text-sm"
              >
                <span className="text-base leading-none">{p.flag}</span>
                <span className="font-semibold">{p.country}</span>
                <button
                  onClick={() => unassign(p.slug)}
                  disabled={busy === p.slug}
                  className="text-brand-700 hover:text-brand-900 disabled:opacity-50 -mr-0.5 p-1"
                  aria-label={`Unassign ${p.country}`}
                >
                  {busy === p.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic mb-5">No packs assigned yet.</p>
      )}

      {/* Available */}
      {unassignedLivePacks.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">
            Available ({unassignedLivePacks.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unassignedLivePacks.map(p => (
              <button
                key={p.slug}
                onClick={() => assign(p.slug)}
                disabled={busy === p.slug}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 rounded-full pl-2.5 pr-3 py-1 text-sm disabled:opacity-50"
              >
                <span className="text-base leading-none">{p.flag}</span>
                <span>{p.country}</span>
                {busy === p.slug
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Plus className="w-3.5 h-3.5 text-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">{error}</p>
      )}

      {/* Footnote about France being free and coming-soon vs live */}
      <p className="text-xs text-gray-400 mt-5 inline-flex items-start gap-1.5">
        <Crown className="w-3 h-3 mt-0.5 shrink-0" />
        Premium covers every assigned pack for every child. Free for life on France, included on the rest.
      </p>
    </section>
  )
}
