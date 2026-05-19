'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Loader2, Check } from 'lucide-react'
import { AVATAR_OPTIONS } from '@/lib/passport-types'

export default function EditProfileSection({
  childId,
  initialName,
  initialAvatar,
}: {
  childId: string
  initialName: string
  initialAvatar: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [avatar, setAvatar] = useState(initialAvatar)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = name.trim() !== initialName || avatar !== initialAvatar

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/family/children/${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Profile</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-4xl leading-none w-12 h-12 flex items-center justify-center bg-brand-50 rounded-lg shrink-0">
              {avatar || '🧒'}
            </div>
            <input
              type="text"
              value={avatar}
              onChange={e => setAvatar(e.target.value.slice(0, 16))}
              maxLength={16}
              placeholder="Type any emoji"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent text-lg"
              aria-label="Avatar emoji"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center mr-1">Or pick:</span>
            {AVATAR_OPTIONS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  avatar === emoji
                    ? 'bg-brand-100 ring-2 ring-brand-600'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                aria-label={`Pick ${emoji}`}
                aria-pressed={avatar === emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
        )}

        <div>
          <button
            onClick={save}
            disabled={!dirty || saving || !name.trim()}
            className="btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-60"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : saved
                ? <><Check className="w-4 h-4" /> Saved</>
                : 'Save changes'}
          </button>
        </div>
      </div>
    </section>
  )
}
