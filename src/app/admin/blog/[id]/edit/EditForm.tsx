'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, Save, Trash2, ExternalLink, Eye, FileEdit, Check, Upload,
  Loader2, Crown, Plus, Link as LinkIcon, Clock, CalendarDays,
  Sparkles, Copy, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react'
import type { BlogPostRow, BlogLink } from '@/lib/blog-db'
import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/blog-categories'
import CoverFocalPicker from '@/components/blog/CoverFocalPicker'
import { buildRewritePrompt } from '@/lib/blog-rewrite-prompt'
import { resizeImageIfLarge } from '@/lib/image-resize'

const MAX_MINUTES = 20
const WORDS_PER_MIN = 200

type EditLink = BlogLink & { _key: string }

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

function suggestedLabelsFor(category: BlogCategory | ''): string[] {
  switch (category) {
    case 'accommodation': return ['Booking', 'Their website', 'Airbnb listing']
    case 'restaurant':    return ['Menu', 'Booking', 'Instagram', 'Their website']
    case 'bar':           return ['Their website', 'Instagram', 'Menu']
    case 'activity':      return ['Booking', 'Tickets', 'Opening times', 'Their website']
    default:              return ['Website', 'Menu', 'Booking', 'Instagram']
  }
}

// Trim a Supabase timestamptz to the yyyy-mm-dd that an <input type="date">
// expects. Returns '' for null/invalid.
function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export default function EditForm({ post, justCreated }: { post: BlogPostRow; justCreated: boolean }) {
  const router = useRouter()

  const [title, setTitle] = useState(post.title)
  const [slug, setSlug] = useState(post.slug)
  const [excerpt, setExcerpt] = useState(post.excerpt ?? '')
  const [coverImage, setCoverImage] = useState(post.cover_image ?? '')
  const [tagsText, setTagsText] = useState(post.tags.join(', '))
  const [body, setBody] = useState(post.body_markdown)
  const [status, setStatus] = useState<'draft' | 'published'>(post.status)
  const [isPremium, setIsPremium] = useState<boolean>(post.is_premium)
  const [category, setCategory] = useState<BlogCategory | ''>(post.category ?? '')
  const [placeName, setPlaceName] = useState(post.place_name ?? '')
  const [focalX, setFocalX] = useState<number>(post.cover_focal_x ?? 50)
  const [focalY, setFocalY] = useState<number>(post.cover_focal_y ?? 50)

  const [tripDate, setTripDate] = useState<string>(post.trip_date ?? '')
  const [targetMinutes, setTargetMinutes] = useState<number>(post.target_minutes ?? 3)
  const [publishedDate, setPublishedDate] = useState<string>(isoToDateInput(post.published_at))
  const [links, setLinks] = useState<EditLink[]>(
    post.links.map((l, i) => ({ ...l, _key: `seed-${i}` })),
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'info' } | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  // Rewrite panel state
  const [rewriteOpen, setRewriteOpen] = useState(false)
  const [rewriteMinutes, setRewriteMinutes] = useState<number>(targetMinutes)
  const [rewriteNotes, setRewriteNotes] = useState('')
  const [rewriteResponse, setRewriteResponse] = useState('')
  const [rewriteCopied, setRewriteCopied] = useState(false)
  const [rewriteApplyError, setRewriteApplyError] = useState<string | null>(null)
  const [rewriteApplied, setRewriteApplied] = useState(false)

  const suggestedLabels = suggestedLabelsFor(category)

  // ── Read-time analysis ──
  const actualWords = useMemo(() => countWords(body), [body])
  const actualMinutes = Math.max(1, Math.ceil(actualWords / WORDS_PER_MIN))
  const targetWordsLo = Math.max(120, targetMinutes * WORDS_PER_MIN - Math.round(WORDS_PER_MIN * 0.4))
  const targetWordsHi = targetMinutes * WORDS_PER_MIN
  // Severity bands
  const lengthSignal: { tone: 'ok' | 'short' | 'long' | 'wildly-short' | 'wildly-long'; message: string; suggestion: number | null } = (() => {
    if (actualWords === 0) return { tone: 'ok', message: 'Nothing written yet.', suggestion: null }
    const ratio = actualMinutes / targetMinutes
    if (ratio < 0.5) {
      const suggestion = Math.max(1, actualMinutes)
      return {
        tone: 'wildly-short',
        message: `Way under target. You aimed for ${targetMinutes} min but this is more like a ${suggestion} min read. Add more, or drop the target.`,
        suggestion,
      }
    }
    if (ratio < 0.75) {
      const suggestion = Math.max(1, actualMinutes)
      return {
        tone: 'short',
        message: `A bit short for ${targetMinutes} min. Reads as ${suggestion} min. Consider adding a section, or drop the target.`,
        suggestion,
      }
    }
    if (ratio > 1.6) {
      const suggestion = Math.min(MAX_MINUTES, actualMinutes)
      return {
        tone: 'wildly-long',
        message: `Way over target. You aimed for ${targetMinutes} min but this is a ${suggestion} min read. Trim it, or bump the target.`,
        suggestion,
      }
    }
    if (ratio > 1.3) {
      const suggestion = Math.min(MAX_MINUTES, actualMinutes)
      return {
        tone: 'long',
        message: `A bit long for ${targetMinutes} min. Reads as ${suggestion} min. Consider trimming, or bump the target.`,
        suggestion,
      }
    }
    return {
      tone: 'ok',
      message: `On target — ${actualMinutes} min read, ~${actualWords} words.`,
      suggestion: null,
    }
  })()

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

  const [showJustCreated, setShowJustCreated] = useState(justCreated)
  useEffect(() => {
    if (!showJustCreated) return
    const t = setTimeout(() => setShowJustCreated(false), 6000)
    return () => clearTimeout(t)
  }, [showJustCreated])

  // ── Link CRUD ──
  const addLink = (label = '') =>
    setLinks(prev => [...prev, { url: '', label, _key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }])
  const patchLink = (key: string, patch: Partial<EditLink>) =>
    setLinks(prev => prev.map(l => (l._key === key ? { ...l, ...patch } : l)))
  const removeLink = (key: string) =>
    setLinks(prev => prev.filter(l => l._key !== key))

  const save = async (override?: { status?: 'draft' | 'published' }) => {
    setSaving(true)
    setError(null)
    try {
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean)
      const finalStatus = override?.status ?? status
      const previousStatus = status

      const cleanLinks: BlogLink[] = links
        .map(l => ({ url: l.url.trim(), label: l.label.trim() || 'Website' }))
        .filter(l => l.url.length > 0)

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
          is_premium: isPremium,
          category: category || null,
          place_name: placeName.trim() || null,
          // place_link kept in sync with the first link for back-compat.
          place_link: cleanLinks[0]?.url ?? null,
          links: cleanLinks,
          trip_date: tripDate || null,
          target_minutes: targetMinutes,
          published_at: publishedDate || null,
          cover_focal_x: focalX,
          cover_focal_y: focalY,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const updated = await res.json()
      if (override?.status) setStatus(override.status)
      if (updated.slug && updated.slug !== slug) setSlug(updated.slug)
      if (updated.published_at) setPublishedDate(isoToDateInput(updated.published_at))
      setSavedAt(new Date())
      router.refresh()

      const justPublished = finalStatus === 'published' && previousStatus !== 'published'
      const justUnpublished = finalStatus === 'draft' && previousStatus === 'published'
      let message = 'Draft saved.'
      if (justPublished) message = 'Published! Returning to all posts…'
      else if (justUnpublished) message = 'Moved back to draft.'
      else if (finalStatus === 'published') message = 'Changes published.'

      setToast({ message, kind: 'success' })
      if (justPublished) {
        setTimeout(() => router.push('/admin/blog'), 1200)
      } else {
        setTimeout(() => setToast(null), 3000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  // ── Rewrite helpers ──
  const openRewriteWith = (minutes: number) => {
    setRewriteMinutes(Math.max(1, Math.min(MAX_MINUTES, minutes)))
    setRewriteOpen(true)
    setRewriteApplyError(null)
    setRewriteApplied(false)
    // Scroll into view after the next paint.
    setTimeout(() => {
      document.getElementById('rewrite-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 30)
  }

  const cleanLinksForPrompt: BlogLink[] = links
    .map(l => ({ url: l.url.trim(), label: l.label.trim() || 'Website' }))
    .filter(l => l.url.length > 0)

  const rewritePrompt = buildRewritePrompt({
    title,
    excerpt: excerpt.trim() || null,
    category: category || null,
    placeName: placeName.trim() || null,
    location: null,            // location lives in the wizard only; not modelled on the row
    tripDate: tripDate || null,
    links: cleanLinksForPrompt,
    currentBody: body,
    currentMinutes: actualMinutes,
    targetMinutes: rewriteMinutes,
    additionalNotes: rewriteNotes,
  })

  const copyRewritePrompt = async () => {
    await navigator.clipboard.writeText(rewritePrompt)
    setRewriteCopied(true)
    setTimeout(() => setRewriteCopied(false), 2000)
  }

  // Strip outer triple-backticks (with optional language tag) if present.
  const stripCodeFence = (s: string): string => {
    const t = s.trim()
    if (!t.startsWith('```')) return t
    return t
      .replace(/^```(?:markdown|md)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()
  }

  const looksLikeQuestions = (s: string): boolean =>
    /^\s*QUESTIONS\s*:/im.test(s) && !s.trim().startsWith('```')

  const applyRewrite = () => {
    setRewriteApplyError(null)
    const raw = rewriteResponse.trim()
    if (!raw) {
      setRewriteApplyError('Paste the AI response first.')
      return
    }
    if (looksLikeQuestions(raw)) {
      setRewriteApplyError("The AI returned questions, not a rewrite. Answer them in the notes field above and copy the prompt again.")
      return
    }
    const newBody = stripCodeFence(raw)
    if (newBody.length < 50) {
      setRewriteApplyError('That response looks too short to be a post body. Did you paste the whole thing?')
      return
    }
    setBody(newBody)
    setTargetMinutes(rewriteMinutes)
    setRewriteApplied(true)
    setRewriteResponse('')
    setView('preview')
    setTimeout(() => setRewriteApplied(false), 4000)
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

        {toast && (
          <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg pointer-events-auto ${
              toast.kind === 'success' ? 'bg-brand-700 text-white' : 'bg-gray-900 text-white'
            }`}>
              <Check className="w-5 h-5 shrink-0" />
              <span className="text-sm font-semibold">{toast.message}</span>
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

          {/* Dates row: trip date + publish date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">
                <CalendarDays className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Trip date (when we went)
              </label>
              <input
                type="date"
                value={tripDate}
                onChange={e => setTripDate(e.target.value)}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">Shown near the byline so readers can calibrate. Day is fine if you remember it; pick the 1st if you only know the month.</p>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">
                <CalendarDays className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Publish date
              </label>
              <input
                type="date"
                value={publishedDate}
                onChange={e => setPublishedDate(e.target.value)}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                {status === 'published'
                  ? 'The date shown on the live post. Backdate or fast-forward as you like.'
                  : 'Leave blank to auto-stamp at publish, or pick a date to backdate.'}
              </p>
            </div>
          </div>

          {/* Read-time intelligence panel */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500">
                <Clock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Target read time
              </label>
              <span className="text-sm font-mono font-semibold text-brand-700 tabular-nums">{targetMinutes} min</span>
            </div>
            <input
              type="range"
              min={1}
              max={MAX_MINUTES}
              step={1}
              value={targetMinutes}
              onChange={e => setTargetMinutes(Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
              aria-label="Target read time in minutes"
            />
            <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1 px-0.5">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>{MAX_MINUTES}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Target {targetWordsLo}–{targetWordsHi} words.</p>
            <div className={`mt-3 rounded-lg px-3 py-2.5 text-sm border flex items-start justify-between gap-3 flex-wrap ${
              lengthSignal.tone === 'ok'           ? 'bg-brand-50 border-brand-200 text-brand-900'
              : lengthSignal.tone === 'short'      ? 'bg-amber-50 border-amber-200 text-amber-900'
              : lengthSignal.tone === 'long'       ? 'bg-amber-50 border-amber-200 text-amber-900'
              : lengthSignal.tone === 'wildly-short' ? 'bg-red-50 border-red-200 text-red-900'
              :                                       'bg-red-50 border-red-200 text-red-900'
            }`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug">{lengthSignal.message}</p>
                <p className="text-xs opacity-70 mt-0.5">Currently ~{actualWords} words.</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 flex-wrap">
                {lengthSignal.suggestion !== null && lengthSignal.suggestion !== targetMinutes && (
                  <button
                    type="button"
                    onClick={() => setTargetMinutes(lengthSignal.suggestion!)}
                    className="text-xs font-semibold bg-white/80 hover:bg-white border border-current/30 px-3 py-1.5 rounded-md"
                  >
                    Set target to {lengthSignal.suggestion} min
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openRewriteWith(targetMinutes)}
                  className="text-xs font-semibold bg-white/80 hover:bg-white border border-current/30 px-3 py-1.5 rounded-md inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Rewrite to {targetMinutes} min
                </button>
              </div>
            </div>

            {/* Rewrite-to-N-min panel (collapsible) */}
            <div id="rewrite-panel" className="mt-3 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setRewriteOpen(o => !o)}
                className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  Ask the AI to rewrite this post to a different length
                </span>
                {rewriteOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {rewriteOpen && (
                <div className="px-4 pb-4 pt-1 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">Rewrite to</label>
                      <span className="text-sm font-mono font-semibold text-brand-700 tabular-nums">
                        {rewriteMinutes} min <span className="text-gray-400 font-normal">(currently ~{actualMinutes} min)</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={MAX_MINUTES}
                      step={1}
                      value={rewriteMinutes}
                      onChange={e => setRewriteMinutes(Number(e.target.value))}
                      className="w-full accent-brand-600 cursor-pointer"
                      aria-label="Rewrite target in minutes"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1 px-0.5">
                      <span>1</span>
                      <span>5</span>
                      <span>10</span>
                      <span>15</span>
                      <span>{MAX_MINUTES}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">
                      Anything to add? (optional)
                    </label>
                    <textarea
                      value={rewriteNotes}
                      onChange={e => setRewriteNotes(e.target.value)}
                      rows={4}
                      placeholder={rewriteMinutes > actualMinutes
                        ? "New things to include if expanding — extra moments, prices, what Jax said, anything you forgot first time. Also paste answers here if the AI came back with QUESTIONS."
                        : "Anything to emphasise or de-emphasise when trimming."}
                      className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={copyRewritePrompt}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-100 hover:bg-brand-200 px-4 py-2 rounded-md"
                    >
                      {rewriteCopied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy rewrite prompt</>}
                    </button>
                    <span className="text-xs text-gray-500">
                      Paste into your Claude Project, then paste the response below.
                    </span>
                  </div>

                  <details className="bg-white rounded-lg border border-gray-200">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                      Show the prompt
                    </summary>
                    <pre className="text-xs text-gray-700 px-3 pb-3 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">{rewritePrompt}</pre>
                  </details>

                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">
                      Paste the AI response
                    </label>
                    <textarea
                      value={rewriteResponse}
                      onChange={e => setRewriteResponse(e.target.value)}
                      rows={10}
                      spellCheck={false}
                      placeholder={'```\n<rewritten body>\n```'}
                      className="w-full text-sm font-mono px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                    />
                  </div>

                  {rewriteApplyError && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{rewriteApplyError}</p>
                  )}
                  {rewriteApplied && (
                    <p className="text-sm text-brand-900 bg-brand-50 border border-brand-200 rounded-md px-3 py-2 inline-flex items-center gap-2">
                      <Check className="w-4 h-4" /> Body replaced. Switched to Preview. Remember to Save below.
                    </p>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={applyRewrite}
                      disabled={!rewriteResponse.trim()}
                      className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-4 h-4" /> Replace post body
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRewriteResponse(''); setRewriteApplyError(null) }}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
                    >
                      Clear
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    The prompt keeps your existing photos and links intact, and tells the AI to ask follow-up questions instead of padding if there isn't enough material to extend honestly. If you see a <code className="text-xs bg-gray-200 px-1 rounded">QUESTIONS:</code> response, paste your answers into the notes field above and copy the prompt again.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Access</label>
            <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={isPremium}
                onChange={e => setIsPremium(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Crown className={`w-4 h-4 ${isPremium ? 'text-brand-600' : 'text-gray-400'}`} />
                  Premium content
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Card still shows on the homepage and blog list. Only Premium members can open the full post — everyone else hits a paywall.
                </span>
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Post type</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as BlogCategory | '')}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="">— Not set —</option>
                {BLOG_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-1.5">Place name</label>
              <input
                value={placeName}
                onChange={e => setPlaceName(e.target.value)}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Casa Fuzetta"
              />
            </div>
          </div>

          {/* Multi-link editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold tracking-widest uppercase text-gray-500">
                Links
              </label>
              <button
                type="button"
                onClick={() => addLink()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add link
              </button>
            </div>
            {links.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">No links yet. Add any URLs the AI should weave into the body — each gets a label so it knows the CTA phrasing.</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {suggestedLabels.map(lbl => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => addLink(lbl)}
                      className="text-xs font-semibold text-gray-700 bg-white hover:bg-brand-100 hover:text-brand-800 border border-gray-200 px-2.5 py-1 rounded-full"
                    >
                      + {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={l._key} className="bg-white border border-gray-200 rounded-lg p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <input
                      value={l.label}
                      onChange={e => patchLink(l._key, { label: e.target.value })}
                      placeholder="Label (Booking, Menu…)"
                      list={`edit-labels-${l._key}`}
                      className="flex-1 text-sm font-semibold text-gray-800 border-0 focus:outline-none bg-transparent min-w-0"
                    />
                    <datalist id={`edit-labels-${l._key}`}>
                      {suggestedLabels.map(lbl => <option key={lbl} value={lbl} />)}
                    </datalist>
                    <button
                      type="button"
                      onClick={() => removeLink(l._key)}
                      className="p-1 text-gray-400 hover:text-red-600 shrink-0"
                      aria-label="Remove link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input
                      value={l.url}
                      onChange={e => patchLink(l._key, { url: e.target.value })}
                      placeholder="https://…"
                      inputMode="url"
                      autoComplete="off"
                      className="flex-1 text-xs font-mono text-gray-700 border-0 focus:outline-none bg-transparent min-w-0"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">These are saved with the post but editing them here does not retroactively change the post body. To embed a link into existing text, edit the markdown below.</p>
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

            {coverImage && (
              <div className="mt-5">
                <CoverFocalPicker
                  src={coverImage}
                  x={focalX}
                  y={focalY}
                  onChange={({ x, y }) => { setFocalX(x); setFocalY(y) }}
                  onSave={async ({ x, y }) => {
                    const res = await fetch(`/api/admin/blog-posts/${post.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cover_focal_x: x, cover_focal_y: y }),
                    })
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}))
                      throw new Error(body.error || `HTTP ${res.status}`)
                    }
                    router.refresh()
                  }}
                />
              </div>
            )}
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
