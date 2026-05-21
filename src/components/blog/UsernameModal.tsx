'use client'

// Pops up the first time a signed-in user tries to comment or like
// without a username set. Validates client-side as they type and
// posts to /api/account/username. Closes on success and runs the
// caller's onSet so the parent can refresh its state.

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { validateUsername, validateInstagram, normaliseUsername, normaliseInstagram } from '@/lib/usernames'

type Props = {
  open: boolean
  initialUsername?: string | null
  initialInstagram?: string | null
  // Admins can claim reserved names and see the Instagram-handle
  // field. Regular users never see the IG input.
  isAdmin?: boolean
  onClose: () => void
  onSet: (saved: { username: string; instagram_handle: string | null }) => void
}

export default function UsernameModal({
  open, initialUsername, initialInstagram, isAdmin = false, onClose, onSet,
}: Props) {
  const [username, setUsername] = useState(initialUsername ?? '')
  const [instagram, setInstagram] = useState(initialInstagram ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const usernameCheck = validateUsername(username, { bypassReserved: isAdmin })
  const instaCheck = validateInstagram(instagram)
  const formValid = usernameCheck.ok && instaCheck.ok

  const save = async () => {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/account/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: normaliseUsername(username),
          instagram_handle: normaliseInstagram(instagram),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Save failed (HTTP ${res.status})`)
      onSet({ username: body.username, instagram_handle: body.instagram_handle ?? null })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {initialUsername ? 'Update your username' : 'Pick a username'}
            </h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Shown next to your comments and likes. Letters, numbers, periods, hyphens, underscores. 3 to 24 characters.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 -mr-2 -mt-2 p-2"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block mb-3">
          <span className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Username</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono select-none pointer-events-none">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              placeholder="wanderingmum"
              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {username && !usernameCheck.ok && (
            <p className="text-xs text-red-600 mt-1">{usernameCheck.error}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-1">Don&apos;t include the @, we add that for you.</p>
        </label>

        {isAdmin && (
          <label className="block mb-4">
            <span className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Instagram handle <span className="font-normal normal-case tracking-normal text-gray-400">· optional, admin only</span></span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono select-none pointer-events-none">@</span>
              <input
                type="text"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                placeholder="jax.familytravels"
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {instagram && !instaCheck.ok && (
              <p className="text-xs text-red-600 mt-1">{instaCheck.error}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">Don&apos;t include the @. Paste just <span className="font-mono">jax.familytravels</span>, not <span className="font-mono">@jax.familytravels</span>.</p>
          </label>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-4">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 px-4 py-2"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!formValid || saving}
            className="btn-primary !text-sm disabled:opacity-50"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
