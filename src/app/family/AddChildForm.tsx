'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import {
  AVATAR_OPTIONS,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  AGE_MODE_LABELS,
  AGE_MODE_DESCRIPTIONS,
  type PermissionMode,
} from '@/lib/passport-types'

type AgeMode = 'younger' | 'older'

export default function AddChildForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string>(AVATAR_OPTIONS[0])
  const [permission, setPermission] = useState<PermissionMode>('guided')
  const [ageMode, setAgeMode] = useState<AgeMode>('older')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/family/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar, permission_mode: permission, age_mode: ageMode }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.id) throw new Error(body.error || `HTTP ${res.status}`)
      // Jump straight to the child's detail page so the parent can
      // see the QR code and assign packs without an extra click.
      router.push(`/family/${body.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add child')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-xl mx-auto text-left">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Child&apos;s name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={60}
          required
          placeholder="e.g. Eden"
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
        <p className="text-xs text-gray-400 mt-2">
          Tip: bring up your emoji keyboard with <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Cmd+Ctrl+Space</kbd> on Mac or <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Win+.</kbd> on Windows.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Permission mode</label>
        <div className="space-y-2">
          {(Object.keys(PERMISSION_LABELS) as PermissionMode[]).map(mode => (
            <label
              key={mode}
              className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                permission === mode
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="permission"
                value={mode}
                checked={permission === mode}
                onChange={() => setPermission(mode)}
                className="mt-1 accent-brand-600"
              />
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">{PERMISSION_LABELS[mode]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{PERMISSION_DESCRIPTIONS[mode]}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Age mode</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(['younger', 'older'] as const).map(mode => (
            <label
              key={mode}
              className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                ageMode === mode
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="ageMode"
                value={mode}
                checked={ageMode === mode}
                onChange={() => setAgeMode(mode)}
                className="mt-1 accent-brand-600"
              />
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">{AGE_MODE_LABELS[mode]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{AGE_MODE_DESCRIPTIONS[mode]}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="btn-primary w-full justify-center disabled:opacity-60"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
        ) : (
          <>Add child <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </form>
  )
}
