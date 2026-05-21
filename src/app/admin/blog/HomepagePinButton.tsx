'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pin, PinOff, Loader2 } from 'lucide-react'

type Props = {
  postId: string
  initialPinned: boolean
  // Set true when 3 posts are already pinned and this one isn't —
  // prevents pinning a 4th from the client without a round-trip.
  disabled: boolean
}

export default function HomepagePinButton({ postId, initialPinned, disabled }: Props) {
  const router = useRouter()
  const [pinned, setPinned] = useState(initialPinned)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const toggle = async () => {
    const next = !pinned
    setError(null)
    const res = await fetch(`/api/admin/blog-posts/${postId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ homepage_featured: next }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null
      setError(data?.error ?? 'Could not update')
      return
    }
    setPinned(next)
    startTransition(() => router.refresh())
  }

  const isDisabled = pending || (disabled && !pinned)
  const label = pinned ? 'Pinned to homepage' : (disabled ? 'Homepage full (3/3)' : 'Pin to homepage')

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={isDisabled}
        title={label}
        aria-label={label}
        aria-pressed={pinned}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border transition-colors ${
          pinned
            ? 'text-brand-700 bg-brand-50 border-brand-200 hover:bg-brand-100'
            : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {pending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : pinned
            ? <Pin className="w-3.5 h-3.5 fill-current" />
            : <PinOff className="w-3.5 h-3.5" />}
        {pinned ? 'Pinned' : 'Pin to home'}
      </button>
      {error && <span className="text-xs text-red-600 max-w-[14rem]">{error}</span>}
    </div>
  )
}
