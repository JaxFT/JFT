'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

type Props = {
  id: string
  title: string
  status: 'draft' | 'published'
}

export default function DeleteGuideButton({ id, title, status }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    const warning = status === 'published'
      ? `Delete the PUBLISHED guide "${title}"? It will disappear from the public listing immediately. This cannot be undone.`
      : `Delete the draft "${title}"? This cannot be undone.`
    if (!confirm(warning)) return

    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/guides/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-white hover:bg-red-600 border border-red-200 px-3 py-2 rounded-md disabled:opacity-50"
        title={`Delete "${title}"`}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Delete
      </button>
      {error && <span className="text-xs text-red-700 ml-2">{error}</span>}
    </>
  )
}
