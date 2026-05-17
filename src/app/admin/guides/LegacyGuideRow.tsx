'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, FileText } from 'lucide-react'

type Props = {
  id: string
  slug: string
  name: string
  subtitle: string | null
  active: boolean
  supersededByWeb: boolean
}

export default function LegacyGuideRow({
  id, slug, name, subtitle, active, supersededByWeb,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [activeState, setActiveState] = useState(active)
  const [error, setError] = useState<string | null>(null)

  const toggle = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/legacy-guides/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !activeState }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setActiveState(!activeState)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 flex-wrap">
      <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${
            activeState
              ? 'bg-brand-100 text-brand-800'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {activeState ? 'Live' : 'Hidden'}
          </span>
          {supersededByWeb && (
            <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Web version exists
            </span>
          )}
        </div>
        <p className="font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">/{slug}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 italic truncate">{subtitle}</p>}
        {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md border disabled:opacity-50 shrink-0 ${
          activeState
            ? 'text-gray-700 border-gray-200 hover:bg-gray-100'
            : 'text-brand-700 border-brand-200 bg-brand-50 hover:bg-brand-100'
        }`}
        title={activeState ? 'Hide from public listing' : 'Show on public listing'}
      >
        {busy
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
          : activeState
            ? <><EyeOff className="w-3.5 h-3.5" /> Hide</>
            : <><Eye className="w-3.5 h-3.5" /> Show</>}
      </button>
    </li>
  )
}
