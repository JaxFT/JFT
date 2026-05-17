'use client'

// Admin-only preview that doubles as an in-place editor.
//
// Two render paths, picked based on the guide's shape:
//   - body_markdown is set  → single-doc mode (new default). One big
//     markdown body, one big editor, image-placeholder upload slots,
//     image-at-cursor button, Write/Preview tabs.
//   - body_markdown is empty → legacy blocks mode (Sri Lanka). Per-block
//     click-to-edit, identical to the previous behaviour.
//
// Both share the same sticky banner (Edit toggle, Publish, links) and
// cover hero.

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Crown, Map, ListOrdered, Eye, EyeOff,
  Pencil, Loader2, Check, X, FileEdit, Sparkles, Image as ImageIcon, Upload,
} from 'lucide-react'
import GuideMarkdown from './GuideMarkdown'
import type { GuideRow, GuideContentBlock } from '@/lib/guide-types'
import { extractMarkdownToc } from '@/lib/guide-types'
import type { AutoLinkPhrase } from '@/lib/blog-links'

type Props = {
  guide: GuideRow
  aboutUsMarkdown: string
  autoLinkPhrases: AutoLinkPhrase[]
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function anchor(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

function blockAnchor(b: GuideContentBlock): string {
  const h = anchor(b.heading) || 'section'
  return `block-${h}-${b.id.slice(0, 6)}`
}

export default function EditablePreview({ guide, aboutUsMarkdown, autoLinkPhrases }: Props) {
  const useSingleDoc = guide.body_markdown.trim().length > 0
  return useSingleDoc
    ? <SingleDocPreview guide={guide} aboutUsMarkdown={aboutUsMarkdown} autoLinkPhrases={autoLinkPhrases} />
    : <BlocksPreview guide={guide} aboutUsMarkdown={aboutUsMarkdown} autoLinkPhrases={autoLinkPhrases} />
}

// ─────────────────────────────────────────────────────────────
// SINGLE-DOC MODE — the new default
// ─────────────────────────────────────────────────────────────

function SingleDocPreview({ guide, aboutUsMarkdown, autoLinkPhrases }: Props) {
  const router = useRouter()
  const hideAbout = !!guide.sections.hideAbout

  const [body, setBody] = useState(guide.body_markdown)
  const [savedBody, setSavedBody] = useState(guide.body_markdown)
  const [status, setStatus] = useState<'draft' | 'published'>(guide.status)
  const [editMode, setEditMode] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorFileInputRef = useRef<HTMLInputElement>(null)

  const dirty = body !== savedBody
  const placeholders = useMemo(() => detectImagePlaceholders(body), [body])
  const toc = useMemo(() => {
    const t = extractMarkdownToc(body)
    if (aboutUsMarkdown.trim() && !hideAbout) t.unshift({ id: 'about-us', label: 'About us' })
    return t
  }, [body, aboutUsMarkdown, hideAbout])

  const saveBody = async (): Promise<boolean> => {
    setSaveState('saving')
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/guides/${guide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_markdown: body }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setSavedBody(body)
      setSaveState('saved')
      setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500)
      return true
    } catch (e) {
      setSaveState('error')
      setSaveError(e instanceof Error ? e.message : 'Save failed')
      return false
    }
  }

  const publish = async () => {
    if (publishing) return
    // Auto-save any pending edits first so we don't publish stale.
    if (dirty) {
      const ok = await saveBody()
      if (!ok) return
    }
    setPublishing(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/guides/${guide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setStatus('published')
      router.refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/blog-photos/upload', { method: 'POST', body: form })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      return j.url
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }

  const insertAtCursor = (md: string) => {
    const ta = textareaRef.current
    if (!ta) {
      setBody(b => `${b}\n\n${md}\n`)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = body.slice(0, start) + md + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + md.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const handleCursorUpload = async (file: File) => {
    const url = await uploadFile(file)
    if (url) insertAtCursor(`![](${url})`)
  }

  const handlePlaceholderUpload = async (p: Placeholder, file: File) => {
    const url = await uploadFile(file)
    if (!url) return
    const replacement = `![${p.caption}](${url})`
    const idx = body.indexOf(p.raw)
    const next = idx >= 0
      ? body.slice(0, idx) + replacement + body.slice(idx + p.raw.length)
      : body + '\n\n' + replacement
    setBody(next)
  }

  return (
    <div>
      <Banner
        guide={guide}
        status={status}
        editMode={editMode}
        setEditMode={setEditMode}
        publish={publish}
        publishing={publishing}
        publishDisabled={uploading || saveState === 'saving'}
        saveState={saveState}
        saveError={saveError}
        dirty={dirty}
        onManualSave={editMode ? saveBody : undefined}
      />

      <div className="min-h-screen bg-sand-50 pb-20">
        <CoverHero guide={guide} />

        {/* VIEW MODE — render the whole doc with TOC, same as readers see */}
        {!editMode && (
          <>
            {toc.length > 0 && <TocBlock toc={toc} />}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-12">
              {aboutUsMarkdown.trim() && !hideAbout && (
                <section id="about-us" className="scroll-mt-24 mb-12">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-5 pb-3 border-b border-gray-200">About us</h2>
                  <GuideMarkdown markdown={aboutUsMarkdown} autoLinkPhrases={autoLinkPhrases} />
                </section>
              )}
              <GuideMarkdown markdown={savedBody} autoLinkPhrases={autoLinkPhrases} />
            </div>
          </>
        )}

        {/* EDIT MODE — one big editor */}
        {editMode && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10">
            <div className="bg-white rounded-2xl border-2 border-brand-400 shadow-md p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-xs font-bold tracking-widest uppercase text-brand-700 inline-flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Editing the whole guide body
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

              {/* Image placeholder slots */}
              {placeholders.length > 0 && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-bold tracking-widest uppercase text-amber-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> {placeholders.length} image placeholder{placeholders.length === 1 ? '' : 's'} found
                  </p>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Upload the right photo for each placeholder and it will replace the marker in your text.
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {placeholders.map((p, i) => (
                      <PlaceholderSlot
                        key={`${i}-${p.start}`}
                        placeholder={p}
                        onUpload={file => handlePlaceholderUpload(p, file)}
                        uploading={uploading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Image-at-cursor toolbar */}
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                <input
                  ref={cursorFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleCursorUpload(f)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => cursorFileInputRef.current?.click()}
                  disabled={uploading || view !== 'write'}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-md disabled:opacity-50"
                >
                  {uploading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                    : <><Upload className="w-3.5 h-3.5" /> Insert image at cursor</>}
                </button>
                {uploadError && <span className="text-xs text-red-700">{uploadError}</span>}
              </div>

              {view === 'write' ? (
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={Math.min(40, Math.max(20, body.split('\n').length + 2))}
                  spellCheck
                  className="w-full text-sm font-mono text-gray-800 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                  placeholder={'## …\n\nThe whole guide as markdown.'}
                  autoFocus
                />
              ) : (
                <div className="border border-gray-200 rounded-lg p-5 bg-sand-50/50 max-h-[70vh] overflow-y-auto">
                  <GuideMarkdown markdown={body} autoLinkPhrases={autoLinkPhrases} />
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setBody(savedBody); setEditMode(false) }}
                  disabled={saveState === 'saving'}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-md disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Discard changes
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await saveBody()
                    if (ok) setEditMode(false)
                  }}
                  disabled={saveState === 'saving' || !dirty}
                  className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveState === 'saving'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><Check className="w-4 h-4" /> Save &amp; close</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LEGACY BLOCKS MODE — kept verbatim for Sri Lanka
// ─────────────────────────────────────────────────────────────

function BlocksPreview({ guide, aboutUsMarkdown, autoLinkPhrases }: Props) {
  const router = useRouter()
  const hideAbout = !!guide.sections.hideAbout

  const [blocks, setBlocks] = useState<GuideContentBlock[]>(
    () => (guide.sections.blocks ?? []).slice().sort((a, b) => a.order - b.order),
  )
  const [status, setStatus] = useState<'draft' | 'published'>(guide.status)
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  const toc = useMemo(() => {
    const entries: Array<{ id: string; label: string }> = []
    if (aboutUsMarkdown.trim() && !hideAbout) entries.push({ id: 'about-us', label: 'About us' })
    for (const b of blocks) {
      if ((b.body ?? '').trim() || b.heading.trim()) {
        entries.push({ id: blockAnchor(b), label: b.heading || 'Section' })
      }
    }
    return entries
  }, [blocks, aboutUsMarkdown, hideAbout])

  const saveBlock = async (id: string, patch: Partial<GuideContentBlock>) => {
    setSaveState('saving')
    setSaveError(null)
    const nextBlocks = blocks.map(b => (b.id === id ? { ...b, ...patch } : b))
    try {
      const res = await fetch(`/api/admin/guides/${guide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: { blocks: nextBlocks, hideAbout } }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setBlocks(nextBlocks)
      setSaveState('saved')
      setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500)
      return true
    } catch (e) {
      setSaveState('error')
      setSaveError(e instanceof Error ? e.message : 'Save failed')
      return false
    }
  }

  const publish = async () => {
    if (status === 'published' || publishing) return
    setPublishing(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/admin/guides/${guide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setStatus('published')
      router.refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div>
      <Banner
        guide={guide}
        status={status}
        editMode={editMode}
        setEditMode={(v) => { if (!v) setEditingId(null); setEditMode(v) }}
        publish={publish}
        publishing={publishing}
        publishDisabled={editingId !== null || saveState === 'saving'}
        saveState={saveState}
        saveError={saveError}
      />

      <div className="min-h-screen bg-sand-50 pb-20">
        <CoverHero guide={guide} />

        {toc.length > 0 && <TocBlock toc={toc} />}

        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-12 space-y-12">
          {aboutUsMarkdown.trim() && !hideAbout && (
            <section id="about-us" className="scroll-mt-24">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-5 pb-3 border-b border-gray-200">About us</h2>
              <GuideMarkdown markdown={aboutUsMarkdown} autoLinkPhrases={autoLinkPhrases} />
            </section>
          )}

          {blocks.map(b => (
            <BlockSection
              key={b.id}
              block={b}
              autoLinkPhrases={autoLinkPhrases}
              editMode={editMode}
              isEditing={editingId === b.id}
              onStartEdit={() => setEditingId(b.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={async patch => {
                const ok = await saveBlock(b.id, patch)
                if (ok) setEditingId(null)
              }}
              saving={saveState === 'saving' && editingId === b.id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────────────────────

function Banner({
  guide, status, editMode, setEditMode, publish, publishing, publishDisabled,
  saveState, saveError, dirty, onManualSave,
}: {
  guide: GuideRow
  status: 'draft' | 'published'
  editMode: boolean
  setEditMode: (v: boolean) => void
  publish: () => void
  publishing: boolean
  publishDisabled: boolean
  saveState: SaveState
  saveError: string | null
  dirty?: boolean
  onManualSave?: () => void
}) {
  return (
    <div className="sticky top-0 z-30 bg-amber-500 text-amber-950 text-sm font-semibold">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <span className="inline-flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Admin preview &middot; {status === 'published' ? 'PUBLISHED' : 'DRAFT'}
          <SaveBadge state={saveState} error={saveError} dirty={!!dirty} />
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {onManualSave && editMode && dirty && (
            <button
              type="button"
              onClick={onManualSave}
              disabled={saveState === 'saving'}
              className="inline-flex items-center gap-1.5 bg-amber-950/15 hover:bg-amber-950/25 px-3 py-1.5 rounded text-xs disabled:opacity-50"
            >
              {saveState === 'saving' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving</> : <><Check className="w-3.5 h-3.5" /> Save</>}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold ${
              editMode
                ? 'bg-amber-950 text-amber-50 hover:bg-amber-900'
                : 'bg-amber-950/15 hover:bg-amber-950/25'
            }`}
          >
            {editMode ? <><EyeOff className="w-3.5 h-3.5" /> Done editing</> : <><Pencil className="w-3.5 h-3.5" /> Edit body</>}
          </button>
          <Link
            href={`/admin/guides/draft?id=${guide.id}`}
            className="inline-flex items-center gap-1.5 bg-amber-950/10 hover:bg-amber-950/20 px-3 py-1.5 rounded text-xs"
            title="Open the wizard for metadata, cover image, pricing"
          >
            <FileEdit className="w-3.5 h-3.5" /> Settings
          </Link>
          <Link
            href="/admin/guides"
            className="inline-flex items-center gap-1.5 bg-amber-950/10 hover:bg-amber-950/20 px-3 py-1.5 rounded text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All guides
          </Link>
          {status === 'draft' ? (
            <button
              type="button"
              onClick={publish}
              disabled={publishing || publishDisabled}
              className="inline-flex items-center gap-1.5 bg-amber-950 text-amber-50 hover:bg-amber-900 px-4 py-1.5 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              title={publishDisabled ? 'Finish editing first' : 'Make this guide live'}
            >
              {publishing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing…</> : <><Sparkles className="w-3.5 h-3.5" /> Publish</>}
            </button>
          ) : (
            <Link
              href={`/guides/${guide.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 bg-amber-950 text-amber-50 hover:bg-amber-900 px-3 py-1.5 rounded text-xs font-bold"
            >
              View live <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function CoverHero({ guide }: { guide: GuideRow }) {
  return (
    <div className="relative bg-brand-950 text-white">
      {guide.cover_image ? (
        <div className="relative w-full max-w-3xl mx-auto pt-12">
          <img
            src={guide.cover_image}
            alt={guide.title}
            className="block w-full max-h-[70vh] object-contain bg-brand-900"
          />
        </div>
      ) : (
        <div className="w-full max-w-3xl mx-auto pt-12 aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900">
          <Map className="w-20 h-20 text-white/40" />
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {guide.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {guide.tags.map(tag => (
              <span key={tag} className="text-xs font-semibold text-white bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{guide.title}</h1>
        {guide.subtitle && <p className="text-lg text-white/80 mt-3 leading-relaxed">{guide.subtitle}</p>}
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
          <Crown className="w-3.5 h-3.5 text-brand-300" /> Admin preview &middot; full access
        </div>
      </div>
    </div>
  )
}

function TocBlock({ toc }: { toc: Array<{ id: string; label: string }> }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-10">
      <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50">
          <span className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-brand-700">
            <ListOrdered className="w-4 h-4" /> Table of contents
          </span>
          <span className="text-xs text-gray-400 font-medium">{toc.length} sections</span>
        </summary>
        <ol className="border-t border-gray-100 divide-y divide-gray-100">
          {toc.map((entry, i) => (
            <li key={entry.id}>
              <a href={`#${entry.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-900">
                <span className="font-medium truncate">
                  <span className="text-gray-400 font-mono text-xs mr-2 tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
                  {entry.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              </a>
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}

function SaveBadge({ state, error, dirty }: { state: SaveState; error: string | null; dirty: boolean }) {
  if (state === 'saving') return <span className="inline-flex items-center gap-1 text-xs font-medium opacity-80"><Loader2 className="w-3 h-3 animate-spin" /> Saving</span>
  if (state === 'saved')  return <span className="inline-flex items-center gap-1 text-xs font-medium opacity-80"><Check className="w-3 h-3" /> Saved</span>
  if (state === 'error')  return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-900" title={error ?? undefined}>Save failed</span>
  if (dirty)              return <span className="inline-flex items-center gap-1 text-xs font-medium opacity-70">Unsaved</span>
  return null
}

// ─────────────────────────────────────────────────────────────
// Block-mode helpers (legacy)
// ─────────────────────────────────────────────────────────────

function BlockSection({
  block, autoLinkPhrases, editMode, isEditing, onStartEdit, onCancelEdit, onSave, saving,
}: {
  block: GuideContentBlock
  autoLinkPhrases: AutoLinkPhrase[]
  editMode: boolean
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (patch: Partial<GuideContentBlock>) => void | Promise<void>
  saving: boolean
}) {
  if (isEditing) {
    return (
      <BlockEditor
        block={block}
        autoLinkPhrases={autoLinkPhrases}
        onCancel={onCancelEdit}
        onSave={onSave}
        saving={saving}
      />
    )
  }

  const eyebrow = block.kind === 'destination' ? 'Destination' : undefined
  return (
    <section
      id={blockAnchor(block)}
      className={`scroll-mt-24 relative group ${editMode ? 'rounded-xl border-2 border-dashed border-transparent hover:border-brand-400 hover:bg-white/40 p-4 -m-4 transition-colors cursor-pointer' : ''}`}
      onClick={editMode ? onStartEdit : undefined}
      title={editMode ? 'Click to edit this section' : undefined}
    >
      {editMode && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStartEdit() }}
          className="absolute -top-2 right-2 z-10 inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      )}
      {eyebrow && (
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">{eyebrow}</p>
      )}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-5 pb-3 border-b border-gray-200">{block.heading || 'Section'}</h2>
      <GuideMarkdown markdown={block.body} autoLinkPhrases={autoLinkPhrases} />
    </section>
  )
}

function BlockEditor({
  block, autoLinkPhrases, onCancel, onSave, saving,
}: {
  block: GuideContentBlock
  autoLinkPhrases: AutoLinkPhrase[]
  onCancel: () => void
  onSave: (patch: Partial<GuideContentBlock>) => void | Promise<void>
  saving: boolean
}) {
  const [heading, setHeading] = useState(block.heading)
  const [body, setBody] = useState(block.body)
  const [view, setView] = useState<'write' | 'preview'>('write')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorFileInputRef = useRef<HTMLInputElement>(null)

  const dirty = heading !== block.heading || body !== block.body
  const placeholders = useMemo(() => detectImagePlaceholders(body), [body])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel, saving])

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/blog-photos/upload', { method: 'POST', body: form })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      return j.url
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }

  const insertAtCursor = (md: string) => {
    const ta = textareaRef.current
    if (!ta) { setBody(b => `${b}\n\n${md}\n`); return }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = body.slice(0, start) + md + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + md.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const handleCursorUpload = async (file: File) => {
    const url = await uploadFile(file)
    if (url) insertAtCursor(`![](${url})`)
  }

  const handlePlaceholderUpload = async (p: Placeholder, file: File) => {
    const url = await uploadFile(file)
    if (!url) return
    const replacement = `![${p.caption}](${url})`
    const idx = body.indexOf(p.raw)
    const next = idx >= 0
      ? body.slice(0, idx) + replacement + body.slice(idx + p.raw.length)
      : body + '\n\n' + replacement
    setBody(next)
  }

  return (
    <section className="scroll-mt-24 bg-white rounded-2xl border-2 border-brand-400 shadow-md p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-xs font-bold tracking-widest uppercase text-brand-700 inline-flex items-center gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> Editing section
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setView('write')} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${view === 'write' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Write</button>
          <button type="button" onClick={() => setView('preview')} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${view === 'preview' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Preview</button>
        </div>
      </div>

      <input
        value={heading}
        onChange={e => setHeading(e.target.value)}
        placeholder="Section heading"
        className="w-full text-2xl sm:text-3xl font-bold text-gray-900 border-0 border-b border-gray-200 focus:border-brand-500 focus:outline-none px-0 py-2 bg-transparent mb-4"
      />

      {placeholders.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-bold tracking-widest uppercase text-amber-800 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" /> {placeholders.length} image placeholder{placeholders.length === 1 ? '' : 's'} found
          </p>
          <div className="space-y-1.5 pt-1">
            {placeholders.map((p, i) => (
              <PlaceholderSlot key={`${i}-${p.start}`} placeholder={p} onUpload={file => handlePlaceholderUpload(p, file)} uploading={uploading} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center gap-2 flex-wrap">
        <input
          ref={cursorFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleCursorUpload(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => cursorFileInputRef.current?.click()}
          disabled={uploading || view !== 'write'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-md disabled:opacity-50"
        >
          {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : <><Upload className="w-3.5 h-3.5" /> Insert image at cursor</>}
        </button>
        {uploadError && <span className="text-xs text-red-700">{uploadError}</span>}
      </div>

      {view === 'write' ? (
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={Math.min(28, Math.max(10, body.split('\n').length + 2))}
          spellCheck
          className="w-full text-sm font-mono text-gray-800 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
          placeholder={'## …\n\nWrite your section…'}
          autoFocus
        />
      ) : (
        <div className="border border-gray-200 rounded-lg p-5 bg-sand-50/50">
          <GuideMarkdown markdown={body} autoLinkPhrases={autoLinkPhrases} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-md disabled:opacity-50">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave({ heading: heading.trim() || block.heading, body })}
          disabled={saving || !dirty}
          className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save changes</>}
        </button>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Image placeholder detection (shared)
// ─────────────────────────────────────────────────────────────

type Placeholder = { start: number; end: number; caption: string; raw: string }

function detectImagePlaceholders(md: string): Placeholder[] {
  const results: Placeholder[] = []

  const tag = /\[(?:IMAGE|PHOTO|IMG|PIC|INSERT IMAGE|INSERT PHOTO)(?:\s*:\s*([^\]]*))?\]/gi
  let m: RegExpExecArray | null
  while ((m = tag.exec(md))) {
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      caption: (m[1] ?? '').trim(),
      raw: m[0],
    })
  }

  const img = /!\[([^\]]*)\]\(\s*(?:placeholder|none|todo|tbd|insert\s+here|insert\s+image|#)?\s*\)/gi
  while ((m = img.exec(md))) {
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      caption: (m[1] ?? '').trim(),
      raw: m[0],
    })
  }

  return results.sort((a, b) => a.start - b.start)
}

function PlaceholderSlot({
  placeholder, onUpload, uploading,
}: {
  placeholder: Placeholder
  onUpload: (file: File) => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-md px-3 py-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onUpload(f)
          e.target.value = ''
        }}
      />
      <span className="font-mono text-xs text-gray-500 shrink-0">{placeholder.raw}</span>
      <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">
        {placeholder.caption || <em className="text-gray-400">(no caption)</em>}
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 px-2 py-1 rounded shrink-0 disabled:opacity-50"
      >
        <Upload className="w-3 h-3" /> Upload
      </button>
    </div>
  )
}
