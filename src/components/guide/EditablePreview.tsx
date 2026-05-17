'use client'

// Admin-only preview that doubles as an in-place editor. Visually a
// mirror of WebGuideView (cover hero, TOC, blocks) so what you see is
// what readers see — but with an Edit-mode toggle that turns each
// block into a markdown editor with a live preview, plus a Publish
// button in the sticky banner so you can ship without bouncing back
// to the wizard.

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Crown, Map, ListOrdered, Eye, EyeOff,
  Pencil, Loader2, Check, X, FileEdit, Sparkles, Image as ImageIcon, Upload,
} from 'lucide-react'
import GuideMarkdown from './GuideMarkdown'
import type { GuideRow, GuideContentBlock } from '@/lib/guide-types'
import type { AutoLinkPhrase } from '@/lib/blog-links'

type Props = {
  guide: GuideRow
  aboutUsMarkdown: string
  autoLinkPhrases: AutoLinkPhrase[]
}

function anchor(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

function blockAnchor(b: GuideContentBlock): string {
  const h = anchor(b.heading) || 'section'
  return `block-${h}-${b.id.slice(0, 6)}`
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function EditablePreview({ guide, aboutUsMarkdown, autoLinkPhrases }: Props) {
  const router = useRouter()
  const hideAbout = !!guide.sections.hideAbout

  // The single source of truth while the page is mounted. PATCHes
  // update this on success so the rendered view reflects the saved DB
  // state immediately without a full reload.
  const [blocks, setBlocks] = useState<GuideContentBlock[]>(
    () => (guide.sections.blocks ?? []).slice().sort((a, b) => a.order - b.order),
  )
  const [status, setStatus] = useState<'draft' | 'published'>(guide.status)
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  // Keep the TOC in sync with the current block list.
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

  // ── Persist a single block's edits ─────────────────────────
  const saveBlock = async (id: string, patch: Partial<GuideContentBlock>) => {
    setSaveState('saving')
    setSaveError(null)
    const nextBlocks = blocks.map(b => (b.id === id ? { ...b, ...patch } : b))
    try {
      const res = await fetch(`/api/admin/guides/${guide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: { blocks: nextBlocks, hideAbout },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
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

  // ── Publish ────────────────────────────────────────────────
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
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
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
      {/* ── Sticky admin banner ── */}
      <div className="sticky top-0 z-30 bg-amber-500 text-amber-950 text-sm font-semibold">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Admin preview &middot; {status === 'published' ? 'PUBLISHED' : 'DRAFT'}
            <SaveBadge state={saveState} error={saveError} />
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (editMode) setEditingId(null)
                setEditMode(m => !m)
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold ${
                editMode
                  ? 'bg-amber-950 text-amber-50 hover:bg-amber-900'
                  : 'bg-amber-950/15 hover:bg-amber-950/25'
              }`}
            >
              {editMode ? <><EyeOff className="w-3.5 h-3.5" /> Done editing</> : <><Pencil className="w-3.5 h-3.5" /> Edit mode</>}
            </button>
            <Link
              href={`/admin/guides/draft?id=${guide.id}`}
              className="inline-flex items-center gap-1.5 bg-amber-950/10 hover:bg-amber-950/20 px-3 py-1.5 rounded text-xs"
              title="Open the wizard for structural edits (reorder, kinds, pricing)"
            >
              <FileEdit className="w-3.5 h-3.5" /> Wizard
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
                disabled={publishing || saveState === 'saving' || editingId !== null}
                className="inline-flex items-center gap-1.5 bg-amber-950 text-amber-50 hover:bg-amber-900 px-4 py-1.5 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                title={editingId ? 'Finish editing the current section first' : 'Make this guide live'}
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

      <div className="min-h-screen bg-sand-50 pb-20">
        {/* ── Cover hero ── */}
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

        {/* ── TOC ── */}
        {toc.length > 0 && (
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
        )}

        {/* ── Content blocks ── */}
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
// Per-block render — view OR edit
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

// Detect image placeholder patterns Claude Chat and similar tools tend
// to leave in markdown when they don't actually have an image yet.
// Returns positions so we can replace each match in place.
type Placeholder = { start: number; end: number; caption: string; raw: string }

function detectImagePlaceholders(md: string): Placeholder[] {
  const results: Placeholder[] = []

  // [IMAGE], [PHOTO], [IMG], [PIC] — with optional ": caption"
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

  // ![caption]() or ![caption](placeholder|none|todo|tbd|#) — incomplete image markdown
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

// In-place markdown editor for a single block. Heading is a text input,
// body is a textarea, with a Preview tab to render the changes before
// saving. Save commits via the parent's PATCH helper. Image placeholders
// in the body get a dedicated upload slot; you can also drop an image
// in at the cursor position any time.
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

  // Esc cancels.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onCancel()
    }
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
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      return body.url
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }

  const insertAtCursor = (markdown: string) => {
    const ta = textareaRef.current
    if (!ta) {
      setBody(b => `${b}\n\n${markdown}\n`)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = body.slice(0, start) + markdown + body.slice(end)
    setBody(next)
    // Restore focus + put the caret after the inserted text.
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + markdown.length
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
    // Re-detect on current body in case it shifted while uploading.
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
          <button
            type="button"
            onClick={() => setView('write')}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
              view === 'write' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >Write</button>
          <button
            type="button"
            onClick={() => setView('preview')}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
              view === 'preview' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >Preview</button>
        </div>
      </div>

      <input
        value={heading}
        onChange={e => setHeading(e.target.value)}
        placeholder="Section heading"
        className="w-full text-2xl sm:text-3xl font-bold text-gray-900 border-0 border-b border-gray-200 focus:border-brand-500 focus:outline-none px-0 py-2 bg-transparent mb-4"
      />

      {/* Image placeholders detected in the body — one upload slot per match */}
      {placeholders.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-bold tracking-widest uppercase text-amber-800 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" /> {placeholders.length} image placeholder{placeholders.length === 1 ? '' : 's'} found
          </p>
          <p className="text-xs text-amber-900/80 leading-relaxed">
            The AI left spots for images. Upload the right photo for each one and it will replace the placeholder in your text.
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

      {/* Editor toolbar — manual cursor-insert image upload */}
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
          title={view !== 'write' ? 'Switch to Write tab to insert at cursor' : 'Insert an image at your cursor position'}
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
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-md disabled:opacity-50"
        >
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

function SaveBadge({ state, error }: { state: SaveState; error: string | null }) {
  if (state === 'idle') return null
  if (state === 'saving') return <span className="inline-flex items-center gap-1 text-xs font-medium opacity-80"><Loader2 className="w-3 h-3 animate-spin" /> Saving</span>
  if (state === 'saved')  return <span className="inline-flex items-center gap-1 text-xs font-medium opacity-80"><Check className="w-3 h-3" /> Saved</span>
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-900" title={error ?? undefined}>Save failed</span>
}
