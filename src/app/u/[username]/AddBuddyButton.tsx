'use client'

// Lets a signed-in visitor add the profile they're looking at as a
// travel buddy directly from that person's own page — the natural
// discovery flow (browse Real Travellers/Recommendations/a country
// hub, land on someone's profile, add them) rather than needing to
// already know their exact username to search for it back in your
// own editor.

import { useState } from 'react'
import { Check, Loader2, UserPlus } from 'lucide-react'

export default function AddBuddyButton({
  targetUserId,
  initialAdded,
}: {
  targetUserId: string
  initialAdded: boolean
}) {
  const [added, setAdded] = useState(initialAdded)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const add = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/travel-profile/buddies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buddy_user_id: targetUserId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not add')
      setAdded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add')
    } finally {
      setBusy(false)
    }
  }

  if (added) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
        <Check className="w-3 h-3" /> Travel buddy
      </span>
    )
  }

  return (
    <div className="inline-flex flex-col items-center">
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-full px-3 py-1.5"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
        Add as travel buddy
      </button>
      {error && <p className="text-[11px] text-red-100 bg-red-600/80 rounded px-2 py-0.5 mt-1">{error}</p>}
    </div>
  )
}
