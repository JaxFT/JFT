'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Save, Loader2, Check, Eye, FileEdit } from 'lucide-react'

export default function AboutForm({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings/about-us', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setSavedAt(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setView('edit')}
          className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            view === 'edit' ? 'text-brand-700 border-b-2 border-brand-600 -mb-px' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileEdit className="w-4 h-4" /> Edit
        </button>
        <button
          onClick={() => setView('preview')}
          className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            view === 'preview' ? 'text-brand-700 border-b-2 border-brand-600 -mb-px' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Eye className="w-4 h-4" /> Preview
        </button>
      </div>

      {view === 'edit' ? (
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={20}
          className="w-full text-sm font-mono text-gray-800 border-0 px-5 py-4 focus:outline-none focus:ring-0 resize-y leading-relaxed"
          placeholder="We're Bec, Oli & Jax…"
        />
      ) : (
        <div className="prose prose-jft max-w-none px-6 py-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || '_Nothing to preview yet._'}</ReactMarkdown>
        </div>
      )}

      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-3 flex-wrap">
        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-1.5">{error}</p>
        )}
        {savedAt && !error && (
          <p className="text-xs text-brand-700 inline-flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Saved at {savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <div className="flex-1" />
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary !py-2 !px-5 !text-sm disabled:opacity-50"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save</>}
        </button>
      </div>
    </div>
  )
}
