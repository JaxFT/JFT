'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Loader2, Upload, FileText, Check, Eye, FileEdit,
} from 'lucide-react'
import GuideMarkdown from '@/components/guide/GuideMarkdown'
import { resizeImageIfLarge } from '@/lib/image-resize'

export default function ImportForm() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [view, setView] = useState<'write' | 'preview'>('write')

  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const wordCount = useMemo(
    () => markdown.trim().split(/\s+/).filter(Boolean).length,
    [markdown],
  )
  const canSubmit = title.trim().length > 0 && markdown.trim().length > 0 && !submitting

  const uploadCover = async (file: File) => {
    setUploadError(null)
    setUploadingCover(true)
    try {
      const { file: prepared } = await resizeImageIfLarge(file)
      const form = new FormData()
      form.append('file', prepared)
      const res = await fetch('/api/admin/blog-photos/upload', { method: 'POST', body: form })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setCoverImage(body.url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingCover(false)
    }
  }

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean)
      const res = await fetch('/api/admin/guides/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          scope: scope.trim() || null,
          subtitle: subtitle.trim() || null,
          tags,
          cover_image: coverImage.trim() || null,
          markdown,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      // Land on the editable preview where the writer can tweak and publish.
      router.push(`/admin/guides/${body.id}/preview`)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Import failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basics card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <Field label="Title" required>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. The Real Vietnam Family Guide"
            className="w-full text-lg px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Scope" hint="Country / region / theme. Leave blank for a global guide.">
          <input
            value={scope}
            onChange={e => setScope(e.target.value)}
            placeholder="Vietnam   /   Worldschooling   /   (blank for global)"
            className="w-full text-base px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Subtitle" hint="One line shown under the title on the listing card.">
          <input
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            placeholder="e.g. A practical, honest guide to travelling Vietnam with kids."
            className="w-full text-base px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Tags" hint="Comma-separated.">
          <input
            value={tagsText}
            onChange={e => setTagsText(e.target.value)}
            placeholder="Asia, Vietnam, Family"
            className="w-full text-sm px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Cover image" hint="Portrait orientation works best (3:4 or 2:3).">
          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) uploadCover(f)
              e.target.value = ''
            }}
          />
          <div className="flex items-start gap-4 flex-wrap">
            {coverImage ? (
              <img loading="lazy"
                src={coverImage}
                alt="Cover preview"
                className="w-28 h-36 object-cover rounded-lg border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-28 h-36 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 shrink-0">
                <Upload className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-[12rem] space-y-2">
              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                disabled={uploadingCover}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-md disabled:opacity-50"
              >
                {uploadingCover ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                ) : (
                  <><Upload className="w-4 h-4" /> {coverImage ? 'Replace cover image' : 'Upload cover image'}</>
                )}
              </button>
              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="block text-xs text-gray-500 hover:text-red-700"
                >
                  Remove cover image
                </button>
              )}
              <input
                value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
                className="w-full text-xs text-gray-500 font-mono border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="…or paste an image URL"
              />
              {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
            </div>
          </div>
        </Field>
      </div>

      {/* Markdown paste + live preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" /> Paste the guide
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              The whole guide as one markdown doc, headings, paragraphs, lists, images. Use <code className="bg-gray-100 px-1 rounded">##</code> for chapter headings (they become the table-of-contents links on the published page). Flip to Preview to see it rendered as readers will.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
            <button
              type="button"
              onClick={() => setView('write')}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md ${
                view === 'write' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" /> Write
            </button>
            <button
              type="button"
              onClick={() => setView('preview')}
              disabled={!markdown.trim()}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-40 ${
                view === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>
        </div>

        {view === 'write' ? (
          <textarea
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            rows={22}
            spellCheck={false}
            placeholder={'# (your title, will be stripped, comes from the form above)\n\nIntro paragraph or two…\n\n## Why Vietnam\n\nThe first chapter…\n\n## Hoi An\n\nThe next chapter…\n\n…and so on.'}
            className="w-full text-sm font-mono text-gray-800 px-6 py-4 border-0 border-t border-gray-100 focus:outline-none focus:ring-0 leading-relaxed"
          />
        ) : (
          <div className="border-t border-gray-100 px-6 py-6 max-h-[70vh] overflow-y-auto bg-sand-50/30">
            {markdown.trim()
              ? <GuideMarkdown markdown={markdown} />
              : <p className="text-sm text-gray-500 italic">Nothing pasted yet.</p>}
          </div>
        )}

        <div className="px-6 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center gap-3 flex-wrap">
          <span className="font-mono tabular-nums">{wordCount.toLocaleString()} words</span>
          <span>·</span>
          <span>~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
        </div>
      </div>

      {/* Submit */}
      {submitError && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn-primary !py-3 !px-6 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating draft…</>
            : <><Check className="w-4 h-4" /> Create draft &amp; open preview <ArrowRight className="w-4 h-4" /></>}
        </button>
        {!title.trim() && <span className="text-xs text-amber-700">Title is required</span>}
        {!markdown.trim() && title.trim() && (
          <span className="text-xs text-amber-700">Paste some markdown first</span>
        )}
      </div>
    </div>
  )
}

function Field({
  label, hint, required, children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  )
}
