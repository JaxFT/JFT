'use client'

// Parent's stamp control panel for one child:
//  - Approval queue (suggestions awaiting decision)
//  - Manual award form (any stamp type)
//  - Full history (awarded + rejected)

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Stamp as StampIcon, Plus, Check, X, Loader2, Trash2, AlertCircle } from 'lucide-react'
import { STAMP_META, type StampType } from '@/lib/passport-types'
import type { ParentStampRow } from '@/lib/passport-db'
import PassportStamp from '@/components/passport/PassportStamp'

const ALL_STAMP_TYPES: StampType[] = [
  'BRAVE_EATER',
  'LOCAL_LINGO',
  'MAP_READER',
  'MONEY_CHANGER',
  'GEOGRAPHY_GENIUS',
  'SCAVENGER_HUNTER',
  'SENSE_SEEKER',
  'STORY_KEEPER',
  'FAMILY_CHATTERBOX',
  'ADVENTURE_PACK_COMPLETE',
  'STEP_CHAMP',
  'EXPLORER_DAY',
  'CULTURE_SPOTTER',
  'NATURE_LOVER',
  'BRAVE_TRAVELLER',
  'WATER_ADVENTURER',
  'EARLY_BIRD',
]

type PackMetaLite = { slug: string; country: string; flag: string }

export default function StampsManagementSection({
  childId,
  childName,
  initialStamps,
  allPacks,
}: {
  childId: string
  childName: string
  initialStamps: ParentStampRow[]
  allPacks: PackMetaLite[]
}) {
  const router = useRouter()
  const [stamps, setStamps] = useState<ParentStampRow[]>(initialStamps)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Manual award form
  const [type, setType] = useState<StampType>('NATURE_LOVER')
  const [countrySlug, setCountrySlug] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [earnedAt, setEarnedAt] = useState<string>(today())
  const [awarding, setAwarding] = useState(false)

  const suggested = useMemo(() => stamps.filter(s => s.status === 'suggested'), [stamps])
  const awarded   = useMemo(() => stamps.filter(s => s.status === 'awarded'), [stamps])

  const packBySlug = useMemo(() => {
    const m = new Map<string, PackMetaLite>()
    for (const p of allPacks) m.set(p.slug, p)
    return m
  }, [allPacks])

  const decide = async (stampId: string, status: 'awarded' | 'rejected') => {
    setBusyId(stampId)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/stamps/${stampId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setStamps(prev => prev.map(s => s.id === stampId
        ? { ...s, status, decided_at: new Date().toISOString() }
        : s))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update stamp')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (stampId: string) => {
    setBusyId(stampId)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/stamps/${stampId}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setStamps(prev => prev.filter(s => s.id !== stampId))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove stamp')
    } finally {
      setBusyId(null)
    }
  }

  const award = async (e: React.FormEvent) => {
    e.preventDefault()
    setAwarding(true)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/stamps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          country_slug: countrySlug || null,
          note: note.trim() || null,
          earned_at: earnedAt,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      // Push the new stamp to the top of the local list with the
      // values we know — server will reconcile on next refresh.
      setStamps(prev => [{
        id: body.id ?? `tmp-${Date.now()}`,
        type,
        country_slug: countrySlug || null,
        note: note.trim() || null,
        awarded_by: 'parent',
        status: 'awarded',
        earned_at: new Date(earnedAt + 'T12:00:00Z').toISOString(),
        decided_at: new Date().toISOString(),
      }, ...prev])
      setNote('')
      setCountrySlug('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not award stamp')
    } finally {
      setAwarding(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <StampIcon className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Stamps</h2>
      </div>

      {/* APPROVAL QUEUE (only when there are suggestions) */}
      {suggested.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <p className="text-sm font-bold text-amber-900">
              {suggested.length} suggested stamp{suggested.length === 1 ? '' : 's'} waiting for you
            </p>
          </div>
          <ul className="space-y-2">
            {suggested.map(s => {
              const meta = STAMP_META[s.type]
              const country = s.country_slug ? packBySlug.get(s.country_slug) : null
              const isBusy = busyId === s.id
              return (
                <li key={s.id} className="flex items-center gap-3 bg-white rounded-lg p-3">
                  <span className="text-2xl leading-none" aria-hidden>{meta.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-500">
                      {country ? <>{country.flag} {country.country} · </> : null}
                      {formatDate(s.earned_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => decide(s.id, 'awarded')}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1.5 rounded-md disabled:opacity-50"
                    aria-label="Approve"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => decide(s.id, 'rejected')}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-red-600 border border-gray-200 px-2.5 py-1.5 rounded-md disabled:opacity-50"
                    aria-label="Reject"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* AWARDED COLLECTION */}
      <div className="mb-6">
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">
          {childName}&apos;s collection ({awarded.length})
        </p>
        {awarded.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No stamps yet.</p>
        ) : (
          <div className="flex flex-wrap items-start gap-3">
            {awarded.map(s => (
              <div key={s.id} className="relative group">
                <PassportStamp
                  type={s.type}
                  country={s.country_slug ? (packBySlug.get(s.country_slug)?.country ?? null) : null}
                  date={s.earned_at}
                  size="sm"
                />
                {/* Subtle remove button on hover */}
                <button
                  onClick={() => remove(s.id)}
                  disabled={busyId === s.id}
                  className="absolute -top-1 -right-1 bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove stamp"
                  title="Remove"
                >
                  {busyId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MANUAL AWARD FORM */}
      <form onSubmit={award} className="border-t border-gray-100 pt-5 space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">Award a stamp manually</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={type}
            onChange={e => setType(e.target.value as StampType)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {ALL_STAMP_TYPES.map(t => (
              <option key={t} value={t}>{STAMP_META[t].emoji} {STAMP_META[t].label}</option>
            ))}
          </select>
          <select
            value={countrySlug}
            onChange={e => setCountrySlug(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="">No country (general)</option>
            {allPacks.map(p => (
              <option key={p.slug} value={p.slug}>{p.flag} {p.country}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 500))}
            placeholder="Note (optional)"
            maxLength={500}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="date"
            value={earnedAt}
            max={today()}
            onChange={e => setEarnedAt(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button
            type="submit"
            disabled={awarding}
            className="btn-primary !py-2 !px-3 !text-sm disabled:opacity-60"
          >
            {awarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Award
          </button>
        </div>

        <p className="text-xs text-gray-400">
          {STAMP_META[type].description}
        </p>
      </form>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">{error}</p>
      )}
    </section>
  )
}

function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
