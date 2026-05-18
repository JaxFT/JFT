'use client'

// Editable intro section shown on the admin preview between the cover
// hero and the TOC. Lets the writer update the framing copy without
// re-importing the whole guide body. Common use: "we've been back twice
// since this guide shipped and added new sections on Tangalle and the
// east coast."
//
// View mode renders the markdown in a subtle card matching the public
// IntroSection look. Click "Edit intro" → expands an inline markdown
// editor with Write/Preview tabs. Save PATCHes intro_markdown only —
// doesn't touch body_markdown or anything else.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, Check, X, Plus } from 'lucide-react'
import GuideMarkdown from './GuideMarkdown'
import type { AutoLinkPhrase } from '@/lib/blog-links'

type Props = {
  guideId: string
  initialMarkdown: string
  autoLinkPhrases?: AutoLinkPhrase[]
}

export default function IntroEditor({ guideId, initialMarkdown, autoLinkPhrases = [] }: Props) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialMarkdown)
  const [draft, setDraft] = useState(initialMarkdown)
  const [editing, setEditing] = useState(false)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = draft !== saved

  const startEdit = () => {
    setDraft(saved)
    setEditing(true)
    setView('write')
    setError(null)
  }

  const cancel = () => {
    setDraft(saved)
    setEditing(false)
    setError(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/guides/${guideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intro_markdown: draft }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setSaved(draft)
      setEditing(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
      {editing ? (
        <div className="bg-white rounded-2xl border-2 border-brand-400 shadow-md p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-700 inline-flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Editing intro
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('write')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md ${view === 'write' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >Write</button>
              <button
                type="button"
                onClick={() => setView('preview')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md ${view === 'preview' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >Preview</button>
            </div>
          </div>

          {view === 'write' ? (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={Math.min(14, Math.max(4, draft.split('\n').length + 2))}
              spellCheck
              className="w-full text-sm font-mono text-gray-800 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
              placeholder={"Short note from us. Markdown is fine.\n\nExample: We've been back to Sri Lanka twice since this guide shipped and added new sections on Tangalle and the east coast."}
              autoFocus
            />
          ) : (
            <div className="border border-gray-200 rounded-lg p-5 bg-sand-50/50 min-h-[80px]">
              {draft.trim()
                ? <GuideMarkdown markdown={draft} autoLinkPhrases={autoLinkPhrases} />
                : <p className="text-sm text-gray-400 italic">Nothing to preview yet.</p>}
            </div>
          )}

          {error && (
            <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-md disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Check className="w-4 h-4" /> Save intro</>}
            </button>
          </div>
        </div>
      ) : saved.trim() ? (
        // Same visual chrome as the public IntroSection, with an Edit
        // affordance on hover.
        <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={startEdit}
            className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1 rounded-md shadow-sm"
          >
            <Pencil className="w-3 h-3" /> Edit intro
          </button>
          <GuideMarkdown markdown={saved} autoLinkPhrases={autoLinkPhrases} />
        </div>
      ) : (
        // No intro yet — surface a clear add button.
        <button
          type="button"
          onClick={startEdit}
          className="w-full bg-white border-2 border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50 rounded-2xl px-5 py-5 text-sm font-semibold text-gray-600 hover:text-brand-700 inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add an intro
          <span className="text-xs font-normal text-gray-400 hidden sm:inline">
            — short note that appears between the cover and the table of contents
          </span>
        </button>
      )}
    </div>
  )
}
