'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Save, Trash2, ExternalLink, Eye, FileEdit, Check, Upload, Loader2 } from 'lucide-react'
import type { BlogPostRow } from '@/lib/blog-db'

export default function EditForm({ post, justCreated }: { post: BlogPostRow; justCreated: boolean }) {
  const router = useRouter()

  const [title, setTitle] = useState(post.title)
  const [slug, setSlug] = useState(post.slug)
  const [excerpt, setExcerpt] = useState(post.excerpt ?? '')
  const [coverImage, setCoverImage] = useState(post.cover_image ?? '')
  const [tagsText, setTagsText] = useState(post.tags.join(', '))
  const [body, setBody] = useState(post.body_markdown)
  const [status, setStatus] = useState<'draft' | 'published'>(post.status)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

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

  // Hide the "just created" banner after a moment
  const [showJustCreated, setShowJustCreated] = useState(justCreated)
  useEffect(() => {
    if (!showJustCreated) return
    const t = setTimeout(() => setShowJustCreated(false), 6000)
    return () => clearTimeout(t)
  }, [showJustCreated])

  const save = async (override?: { status?: 'draft' | 'published' }) => {
    setSaving(true)
    setError(null)
    try {
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean)
      const finalStatus = override?.status ?? status
      const res = await fetch(`/api/admin/blog-posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          excerpt: excerpt.trim() || null,
          cover_image: coverImage.trim() || null,
          tags,
          body_markdown: body,
          status: finalStatus,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const updated = await res.json()
      if (override?.status) setStatus(override.status)
      if (updated.slug && updated.slug !== slug) setSlug(updated.slug)
      setSavedAt(new Date())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm('Delete this post permanently? This cannot be undone.')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/blog-posts/${post.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.push('/admin/blog')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6 text-xs font-bold tracking-widest uppercase">
          <Link href="/admin" className="text-brand-600 hover:underline">Admin</Link>
          <span className="text-gray-400">/</span>
          <Link href="/admin/blog" className="text-brand-600 hover:underline">Blog posts</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">Edit</span>
        </div>

        {showJustCreated && (
          <div className="mb-5 bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-start gap-3">
            <Check className="w-5 h-5 text-brand-700 mt-0.5 shrink-0" />
            <div className="text-sm text-brand-900">
              <strong>Draft saved.</strong> Review the title, slug, and body below, then publish when ready.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> All posts
          </Link>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${
              status === 'published' ? 'bg-brand-100 text-brand-800' : 'bg-amber-50 text-amber-700'
            }`}>
              {status}
            </span>
            {savedAt && (
              <span className="text-xs text-gray-500">Saved {savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 space-y-5">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 focus:border-brand-500 focus:outline-none focus:ring-0 px-0 py-2 bg-transparent"
              placeholder="Post title"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Slug</label>
              <input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                placeholder="penang-food-week"
              />
              <p className="text-xs text-gray-400 mt-1.5">URL: /blog/{slug || '...'}</p>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Tags (comma-separated)</label>
              <input
                value={tagsText}
                onChange={e => setTagsText(e.target.value)}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Malaysia, Penang, Food"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              rows={2}
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              placeholder="One-sentence hook for the blog listing"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Cover image</label>
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
            <div className="flex items-start gap-3 flex-wrap">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 shrink-0">
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
                {uploadError && (
                  <p className="text-xs text-red-700">{uploadError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setView('edit')}
              className={`flex-1 sm:flex-none px-5 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                view === 'edit' ? 'text-brand-700 border-b-2 border-brand-600 -mb-px' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileEdit className="w-4 h-4" /> Markdown
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
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={28}
              spellCheck
              className="w-full text-sm font-mono text-gray-800 border-0 px-5 py-4 focus:outline-none focus:ring-0 resize-y leading-relaxed"
              placeholder="# Your post body in markdown..."
            />
          ) : (
            <div className="prose prose-jft prose-lg max-w-none px-6 py-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || '_Nothing to preview yet._'}</ReactMarkdown>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="sticky bottom-4 mt-6 bg-white rounded-2xl border border-gray-200 shadow-lg p-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={remove}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 px-3 py-2 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <div className="flex-1" />
          {status === 'published' && (
            <Link
              href={`/blog/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50"
            >
              View live <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
          <button
            onClick={() => save({ status: 'draft' })}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save as draft'}
          </button>
          <button
            onClick={() => save({ status: 'published' })}
            disabled={saving}
            className="btn-primary !py-2 !px-5 !text-sm"
          >
            {status === 'published' ? 'Update published post' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
