'use client'

// Gamifies finishing the profile: photo + 3 "been" + 2 "want to go" +
// public unlocks a free Adventure Pack of their choice, one-time only.
// Criteria are recomputed live from the same state the rest of the
// editor already tracks (passed in as props), so the checklist updates
// as they fill things in, no separate fetch needed. The actual grant
// is re-validated server-side regardless, see
// /api/travel-profile/claim-pack.

import { useState } from 'react'
import Link from 'next/link'
import { Check, Gift, Loader2 } from 'lucide-react'
import { PACK_META } from '@/lib/adventurePackMeta'

const CLAIMABLE_PACKS = PACK_META.filter(p => p.status === 'live' && !p.isFree)

export default function ProfileCompletionReward({
  hasPhoto,
  beenCount,
  wantCount,
  isPublic,
  alreadyClaimedSlug,
}: {
  hasPhoto: boolean
  beenCount: number
  wantCount: number
  isPublic: boolean
  alreadyClaimedSlug: string | null
}) {
  const [slug, setSlug] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const [claimedSlug, setClaimedSlug] = useState(alreadyClaimedSlug)

  const checklist = [
    { label: 'Add a profile photo', done: hasPhoto },
    { label: 'Mark 3 countries "I\'ve been"', done: beenCount >= 3 },
    { label: 'Mark 2 countries "I want to go"', done: wantCount >= 2 },
    { label: 'Make your profile public', done: isPublic },
  ]
  const allDone = checklist.every(c => c.done)

  const claim = async () => {
    if (!slug) { setError('Pick a country first'); return }
    setError('')
    setClaiming(true)
    try {
      const res = await fetch('/api/travel-profile/claim-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_slug: slug }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not claim your pack')
      setClaimedSlug(body.country_slug)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not claim your pack')
    } finally {
      setClaiming(false)
    }
  }

  if (claimedSlug) {
    const pack = PACK_META.find(p => p.slug === claimedSlug)
    return (
      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-2xl p-6 flex items-center gap-4">
        <Gift className="w-8 h-8 shrink-0" />
        <div className="flex-1">
          <p className="font-bold">
            You claimed the {pack ? `${pack.flag} ${pack.country}` : 'free'} Adventure Pack!
          </p>
          <Link href={`/adventure-packs/${claimedSlug}`} className="text-sm underline text-white/90 hover:text-white">
            Open it now
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Gift className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Finish your profile, get a free Adventure Pack</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Complete these four things and pick any country pack, on us.</p>

      <ul className="space-y-1.5 mb-4">
        {checklist.map(c => (
          <li key={c.label} className={`flex items-center gap-2 text-sm ${c.done ? 'text-gray-700' : 'text-gray-400'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${c.done ? 'bg-brand-600' : 'bg-gray-200'}`}>
              {c.done && <Check className="w-3 h-3 text-white" />}
            </span>
            {c.label}
          </li>
        ))}
      </ul>

      {allDone && (
        <div className="pt-3 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Choose a country…</option>
              {CLAIMABLE_PACKS.map(p => (
                <option key={p.slug} value={p.slug}>{p.flag} {p.country}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={claim}
              disabled={claiming || !slug}
              className="btn-primary !py-2.5 disabled:opacity-60"
            >
              {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              Claim it
            </button>
          </div>
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-2">{error}</p>}
        </div>
      )}
    </section>
  )
}
