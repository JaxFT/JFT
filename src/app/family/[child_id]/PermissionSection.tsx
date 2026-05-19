'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Loader2, Check, Sparkles } from 'lucide-react'
import {
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  type PermissionMode,
} from '@/lib/passport-types'

export default function PermissionSection({
  childId,
  initialMode,
  initialAutoApprove,
}: {
  childId: string
  initialMode: PermissionMode
  initialAutoApprove: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<PermissionMode>(initialMode)
  const [autoApprove, setAutoApprove] = useState<boolean>(initialAutoApprove)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = mode !== initialMode || autoApprove !== initialAutoApprove

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/family/children/${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission_mode: mode,
          stamp_auto_approve: autoApprove,
        }),
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
        <ShieldCheck className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Permissions</h2>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        Pick how much this child can do on their own from their QR passport.
      </p>

      <div className="space-y-2 mb-5">
        {(Object.keys(PERMISSION_LABELS) as PermissionMode[]).map(m => (
          <label
            key={m}
            className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              mode === m
                ? 'border-brand-600 bg-brand-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="permission"
              value={m}
              checked={mode === m}
              onChange={() => setMode(m)}
              className="mt-1 accent-brand-600"
            />
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900">{PERMISSION_LABELS[m]}</p>
              <p className="text-xs text-gray-500 mt-0.5">{PERMISSION_DESCRIPTIONS[m]}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={e => setAutoApprove(e.target.checked)}
            className="mt-0.5 accent-brand-600"
          />
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-900 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Auto-award stamps from packs
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              When this child completes an Adventure Pack mission, the system can auto-suggest stamps. With this on, those stamps land in the passport instantly. Turn off if you want to review and approve each one first.
            </p>
          </div>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">{error}</p>
      )}

      <div className="mt-5">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-60"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : saved
              ? <><Check className="w-4 h-4" /> Saved</>
              : 'Save changes'}
        </button>
      </div>
    </section>
  )
}
