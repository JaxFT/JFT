'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'

export default function NewGuideButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled guide', country: '' }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      router.push(`/admin/guides/draft?id=${body.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start draft')
      setBusy(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-3">
      {error && <span className="text-xs text-red-700">{error}</span>}
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-50"
      >
        {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</> : <><Plus className="w-4 h-4" /> New guide</>}
      </button>
    </div>
  )
}
