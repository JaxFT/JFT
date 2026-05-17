'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Loader2, Upload, FileText, Sparkles, Check,
} from 'lucide-react'
import { parseGuideMarkdown } from '@/lib/guide-import'

const KIND_LABEL: Record<string, string> = {
  intro:       'Intro',
  destination: 'Destination',
  themed:      'Themed',
  list:        'List',
  closing:     'Closing',
}

export default function ImportForm() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [markdown, setMarkdown] = useState('')

  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Live parse for the inline preview as the writer pastes.
  const preview = useMemo(() => parseGuideMarkdown(markdown), [markdown])
  const canSubmit = title.trim().length > 0 && preview.blocks.length > 0 && !submitting

  const uploadCover = async (file: File) => {
    setUploadError(null)
    setUploadingCover(true)
    try {
      const form = new FormData()
      form.append('file', file)
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
      // Drop the writer into the editable preview — see the guide rendered,
      // tweak text in place, slot images into the AI's placeholders,
      // then publish.
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

        <Field
          label="Scope"
          hint="Country / region / theme. Leave blank for a global guide."
        >
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

        {/* Cover */}
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
              <img
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

      {/* Markdown paste card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" /> Paste the guide markdown
          </h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Use <code className="bg-gray-100 px-1 rounded">##</code> for each section heading. Anything before the first <code className="bg-gray-100 px-1 rounded">##</code> becomes an Intro section. <code className="bg-gray-100 px-1 rounded">#</code> lines (your title) are stripped — the title comes from the form above.
          </p>
        </div>
        <textarea
          value={markdown}
          onChange={e => setMarkdown(e.target.value)}
          rows={18}
          spellCheck={false}
          placeholder={'## Why Vietnam\n\nIt sounded chaotic on paper. Then we arrived…\n\n## Hoi An\n\nWe based ourselves there for two weeks…'}
          className="w-full text-sm font-mono text-gray-800 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
        />
      </div>

      {/* Live preview of detected blocks */}
      {markdown.trim() && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold tracking-widest uppercase text-gray-600">
              Detected sections ({preview.blocks.length})
            </h2>
          </div>

          {preview.warnings.length > 0 && (
            <div className="px-5 pt-4 space-y-1">
              {preview.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{w}</p>
              ))}
            </div>
          )}

          {preview.blocks.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {preview.blocks.map((b, i) => {
                const wordCount = b.body.trim().split(/\s+/).filter(Boolean).length
                return (
                  <li key={b.id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0 font-semibold text-gray-800 truncate">{b.heading}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      b.kind === 'intro'       ? 'bg-blue-50 text-blue-800'
                      : b.kind === 'destination' ? 'bg-emerald-50 text-emerald-800'
                      : b.kind === 'list'      ? 'bg-purple-50 text-purple-800'
                      : b.kind === 'closing'   ? 'bg-amber-50 text-amber-800'
                      :                          'bg-gray-100 text-gray-700'
                    }`}>
                      {KIND_LABEL[b.kind] ?? b.kind}
                    </span>
                    {b.freePreview && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-800">
                        Free
                      </span>
                    )}
                    <span className="text-xs text-gray-400 font-mono tabular-nums shrink-0">{wordCount}w</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-gray-500 text-center">No sections detected yet.</p>
          )}

          <p className="px-5 py-3 text-xs text-gray-400 leading-relaxed border-t border-gray-100">
            You can change any heading, kind, or free-preview toggle on the next screen.
          </p>
        </div>
      )}

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
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creating draft…</>
          ) : (
            <><Check className="w-4 h-4" /> Create draft &amp; open editor <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
        {!title.trim() && <span className="text-xs text-amber-700">Title is required</span>}
        {preview.blocks.length === 0 && markdown.trim() && (
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
