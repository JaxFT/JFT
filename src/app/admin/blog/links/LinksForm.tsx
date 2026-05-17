'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react'

type LinkRow = { id: string; phrase: string; url: string; note: string | null }

export default function LinksForm({ initialLinks }: { initialLinks: LinkRow[] }) {
  const router = useRouter()
  const [links, setLinks] = useState<LinkRow[]>(initialLinks)
  const [phrase, setPhrase] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPhrase, setEditPhrase] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editNote, setEditNote] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null)

  const startEdit = (l: LinkRow) => {
    setEditingId(l.id)
    setEditPhrase(l.phrase)
    setEditUrl(l.url)
    setEditNote(l.note ?? '')
    setRowError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setRowError(null)
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setAdding(true)
    try {
      const res = await fetch('/api/admin/blog-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: phrase.trim(), url: url.trim(), note: note.trim() || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setLinks(prev => [...prev, body.link].sort((a, b) => a.phrase.localeCompare(b.phrase)))
      setPhrase('')
      setUrl('')
      setNote('')
      router.refresh()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add link')
    } finally {
      setAdding(false)
    }
  }

  const saveEdit = async (id: string) => {
    setBusyId(id)
    setRowError(null)
    try {
      const res = await fetch(`/api/admin/blog-links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: editPhrase.trim(), url: editUrl.trim(), note: editNote.trim() || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setLinks(prev =>
        prev
          .map(l => (l.id === id ? { ...l, ...body.link } : l))
          .sort((a, b) => a.phrase.localeCompare(b.phrase)),
      )
      setEditingId(null)
      router.refresh()
    } catch (err) {
      setRowError({ id, msg: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string, phraseLabel: string) => {
    if (!confirm(`Delete the auto-link for "${phraseLabel}"?`)) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/blog-links/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setLinks(prev => prev.filter(l => l.id !== id))
      router.refresh()
    } catch (err) {
      setRowError({ id, msg: err instanceof Error ? err.message : 'Delete failed' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Add form */}
      <form onSubmit={add} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Add an auto-link</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phrase</label>
            <input
              value={phrase}
              onChange={e => setPhrase(e.target.value)}
              required
              placeholder="e.g. Casa Fuzetta"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">URL</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              type="url"
              placeholder="https://…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Note (optional, for your own reference)</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Boutique guesthouse in Olhão"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {addError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{addError}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={adding || !phrase.trim() || !url.trim()}
            className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
          >
            {adding ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <><Plus className="w-4 h-4" /> Add link</>}
          </button>
        </div>
      </form>

      {/* List */}
      {links.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No curated auto-links yet. All matching happens via post tags.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {links.map(l => {
              const isEditing = editingId === l.id
              return (
                <li key={l.id} className="p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          value={editPhrase}
                          onChange={e => setEditPhrase(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5"
                        />
                        <input
                          value={editUrl}
                          onChange={e => setEditUrl(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 font-mono"
                        />
                      </div>
                      <input
                        value={editNote}
                        onChange={e => setEditNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5"
                      />
                      {rowError?.id === l.id && (
                        <p className="text-xs text-red-700">{rowError.msg}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(l.id)}
                          disabled={busyId === l.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md disabled:opacity-50"
                        >
                          {busyId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md border border-gray-200"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{l.phrase}</p>
                        <p className="text-xs text-gray-500 font-mono truncate">{l.url}</p>
                        {l.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{l.note}</p>}
                        {rowError?.id === l.id && (
                          <p className="text-xs text-red-700 mt-1">{rowError.msg}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(l)}
                          className="text-xs font-medium text-gray-600 hover:text-brand-700 px-2 py-1.5 rounded-md hover:bg-gray-50 inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => remove(l.id, l.phrase)}
                          disabled={busyId === l.id}
                          className="text-xs font-medium text-red-600 hover:text-red-800 px-2 py-1.5 rounded-md hover:bg-red-50 inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {busyId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
