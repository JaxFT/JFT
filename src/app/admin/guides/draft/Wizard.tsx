'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Check, Copy, ShieldCheck, Loader2, Upload,
  Plus, Trash2, ChevronDown, ChevronUp, Sparkles, ListTree,
  Eye, EyeOff, ExternalLink, Map as MapIcon,
} from 'lucide-react'
import type {
  GuideRow, GuideSections, GuideContentBlock, GuideBlockKind,
} from '@/lib/guide-types'
import {
  genLocalId, defaultHeadingFor, defaultFreePreviewFor,
} from '@/lib/guide-types'
import { buildBlockPrompt } from '@/lib/guide-prompts'
import { resizeImageIfLarge } from '@/lib/image-resize'
import { generateAndUploadDownload } from '@/lib/admin-guide-pregen'
import { GUIDE_PRICE_TIERS, stripePriceIdForPence } from '@/lib/stripe-price-tiers'

const TOTAL_STEPS = 4

type StepNum = 1 | 2 | 3 | 4
const STEP_LABELS: Record<StepNum, string> = {
  1: 'Basics',
  2: 'Cover image',
  3: 'Sections',
  4: 'Review & publish',
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// In-wizard block carries transient `notes` (user's bullet points the AI
// turns into the body). Notes are not persisted to Supabase.
type WizardBlock = GuideContentBlock & { notes: string }

const KIND_LABELS: Record<GuideBlockKind, { label: string; hint: string }> = {
  intro:       { label: 'Intro / framing',  hint: 'Why-this, who-we-are, what-to-expect' },
  destination: { label: 'Destination',      hint: 'A place chapter, where, eat, do, stay' },
  themed:      { label: 'Themed section',   hint: 'A cross-cutting topic, not tied to one place' },
  list:        { label: 'List / 25 things', hint: 'Numbered list, e.g. "25 free things in Bangkok"' },
  closing:     { label: 'Closing / final',  hint: 'The wrap-up at the end of the guide' },
}

export default function Wizard({ guide }: { guide: GuideRow }) {
  const router = useRouter()

  // Basics
  const [title, setTitle] = useState(guide.title)
  const [subtitle, setSubtitle] = useState(guide.subtitle ?? '')
  const [country, setCountry] = useState(guide.country ?? '')
  const [tagsText, setTagsText] = useState(guide.tags.join(', '))
  const [pricePence, setPricePence] = useState(guide.price_pence)

  // Cover
  const [coverImage, setCoverImage] = useState(guide.cover_image ?? '')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  // Blocks (single ordered array, any kind)
  const [blocks, setBlocks] = useState<WizardBlock[]>(
    () => (guide.sections.blocks ?? []).map(b => ({ ...b, notes: '' })),
  )

  const [step, setStep] = useState<StepNum>(1)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Save helpers ────────────────────────────
  const saveAll = async (
    overrides?: { status?: 'draft' | 'published' },
  ): Promise<{ ok: true; slug: string } | { ok: false; err: string }> => {
    setSaveState('saving')
    setSaveError(null)
    try {
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean)
      const sections: GuideSections = {
        blocks: blocks
          .map(({ notes: _omit, ...b }) => b)
          .sort((a, b) => a.order - b.order),
        hideAbout: guide.sections.hideAbout ?? false,
      }
      const res = await fetch(`/api/admin/guides/${guide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle: subtitle.trim() || null,
          country: country.trim() || null,
          tags,
          price_pence: pricePence,
          cover_image: coverImage.trim() || null,
          sections,
          ...(overrides?.status ? { status: overrides.status } : {}),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setSaveState('saved')
      setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500)
      return { ok: true, slug: body.slug }
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Save failed'
      setSaveState('error')
      setSaveError(err)
      return { ok: false, err }
    }
  }

  // ── Block CRUD ──────────────────────────────
  const addBlock = (kind: GuideBlockKind) => {
    setBlocks(prev => [
      ...prev,
      {
        id: genLocalId(),
        kind,
        heading: defaultHeadingFor(kind, country || null),
        body: '',
        notes: '',
        freePreview: defaultFreePreviewFor(kind),
        order: prev.length,
      },
    ])
  }
  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })))
  }
  const patchBlock = (id: string, patch: Partial<WizardBlock>) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)))
  }
  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx === -1) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      const [picked] = copy.splice(idx, 1)
      copy.splice(target, 0, picked)
      return copy.map((b, i) => ({ ...b, order: i }))
    })
  }

  // ── Cover upload ────────────────────────────
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

  // ── Navigation ──────────────────────────────
  const canAdvance = (): boolean => {
    if (step === 1) return title.trim().length > 0
    return true
  }

  const next = async () => {
    if (!canAdvance()) return
    await saveAll()
    setStep(s => (Math.min(s + 1, TOTAL_STEPS) as StepNum))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }
  const back = () => {
    setStep(s => (Math.max(s - 1, 1) as StepNum))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  const openPreview = async () => {
    await saveAll()
    window.open(`/admin/guides/${guide.id}/preview`, '_blank', 'noopener')
  }

  // Regenerate the offline download file: fetch latest guide from
  // DB, render in the browser, upload to Supabase Storage. Auto-fires
  // on publish, available on demand via the button.
  const [regenState, setRegenState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [regenError, setRegenError] = useState<string | null>(null)
  const regenerateDownloadFile = async () => {
    setRegenState('working')
    setRegenError(null)
    try {
      const r = await fetch(`/api/admin/guides/${guide.id}`)
      if (!r.ok) throw new Error(`Could not fetch guide (HTTP ${r.status})`)
      const fresh: GuideRow = await r.json()
      await generateAndUploadDownload(fresh)
      setRegenState('done')
      setTimeout(() => setRegenState(s => (s === 'done' ? 'idle' : s)), 3000)
    } catch (e) {
      setRegenError(e instanceof Error ? e.message : 'Regeneration failed')
      setRegenState('error')
    }
  }

  const publish = async () => {
    const res = await saveAll({ status: 'published' })
    if (!res.ok) return
    // Fire-and-await the regeneration so buyers don't see an old file
    // (or no file at all) the moment publish completes. We continue to
    // /admin/guides only after either success or error so Bec sees
    // any problem before navigating away.
    await regenerateDownloadFile()
    router.push('/admin/guides')
  }

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Top bar */}
      <div className="sticky top-16 z-10 bg-sand-50/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/admin/guides" className="text-gray-500 hover:text-gray-900 -ml-1 p-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-1.5 flex-1 mx-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i + 1 < step ? 'bg-brand-600' : i + 1 === step ? 'bg-brand-400' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500 font-medium tabular-nums hidden sm:inline">
            {step}/{TOTAL_STEPS}
          </span>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex items-center justify-between text-xs">
          <p className="font-semibold text-brand-700 truncate">{STEP_LABELS[step]}</p>
          <SaveIndicator state={saveState} error={saveError} onRetry={() => saveAll()} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 pb-32 space-y-6">

        {/* STEP 1: Basics */}
        {step === 1 && (
          <div className="space-y-6">
            <Header step={1} icon={<ShieldCheck className="w-3.5 h-3.5" />}>
              The basics
            </Header>
            <p className="text-gray-500 text-base">
              Title, scope, tags. Pricing comes at the end, after you've seen the guide.
            </p>

            <Field label="Title">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. The Real Vietnam Family Guide / Worldschooling: Our Year on the Road"
                className="w-full text-lg px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Field>

            <Field
              label="Scope"
              sub="A country name, a theme like 'Worldschooling', or leave blank for global / no specific place. Used in AI prompts so the writing fits."
            >
              <input
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="Vietnam   /   Worldschooling   /   (leave blank for global)"
                className="w-full text-lg px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Field>

            <Field label="Subtitle" sub="One line under the title on listing cards.">
              <input
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="e.g. A practical, no-fluff guide to travelling Vietnam with kids."
                className="w-full text-base px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Field>

            <Field label="Tags (comma-separated)">
              <input
                value={tagsText}
                onChange={e => setTagsText(e.target.value)}
                placeholder="Asia, Vietnam, Family"
                className="w-full text-sm px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Field>
          </div>
        )}

        {/* STEP 2: Cover image (upload only) */}
        {step === 2 && (
          <div className="space-y-6">
            <Header step={2} icon={<MapIcon className="w-3.5 h-3.5" />}>
              Cover image
            </Header>
            <p className="text-gray-500 text-base">
              Upload the image you want at the top of the guide. Portrait works best (3:4 or 2:3). You can also paste a URL.
            </p>

            <Field label="Upload cover image">
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
                    className="w-32 h-40 object-cover rounded-lg border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="w-32 h-40 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 shrink-0">
                    <Upload className="w-7 h-7" />
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
        )}

        {/* STEP 3: Sections OR single-doc body redirect */}
        {step === 3 && (
          <div className="space-y-6">
            <Header step={3} icon={<ListTree className="w-3.5 h-3.5" />}>
              {guide.body_markdown.trim() ? 'Guide body' : 'Sections'}
            </Header>

            {guide.body_markdown.trim() ? (
              // Single-doc guide: the wizard isn't the right place to edit
              // the body. Send the writer to the preview where the in-place
              // editor lives.
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  This guide uses the new single-document format. Edit the body and slot images into AI placeholders on the preview page, it shows the guide rendered exactly as readers will see it, with click-to-edit.
                </p>
                <Link
                  href={`/admin/guides/${guide.id}/preview`}
                  className="inline-flex items-center gap-1.5 btn-primary !py-2 !px-4 !text-sm"
                >
                  Open editable preview <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Use this wizard for cover image, title, scope, tags, pricing, and publish. The body lives on the preview.
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-500 text-base">
                  Add as many sections as you want, in any order. Each one suggests an AI prompt tailored to its kind, but the heading is yours to set however you like.
                </p>

                {blocks.length === 0 && (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center space-y-3">
                    <p className="text-sm text-gray-500">No sections yet. Add your first.</p>
                    <AddBlockBar onAdd={addBlock} />
                  </div>
                )}

                {blocks.map((b, idx) => (
                  <BlockCard
                    key={b.id}
                    index={idx}
                    total={blocks.length}
                    guideTitle={title}
                    scope={country}
                    block={b}
                    onPatch={patch => patchBlock(b.id, patch)}
                    onRemove={() => removeBlock(b.id)}
                    onMoveUp={() => moveBlock(b.id, -1)}
                    onMoveDown={() => moveBlock(b.id, 1)}
                    onSave={() => saveAll()}
                  />
                ))}

                {blocks.length > 0 && (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-brand-200 p-5">
                    <AddBlockBar onAdd={addBlock} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* STEP 4: Review + price + preview + publish */}
        {step === 4 && (
          <div className="space-y-6">
            <Header step={4} icon={<Check className="w-3.5 h-3.5" />}>
              Review &amp; publish
            </Header>
            <p className="text-gray-500 text-base">
              Take a last look. Preview opens the guide as readers will see it. Set the price, then publish.
            </p>

            <ReviewChecklist
              items={[
                { label: 'Title',           ok: title.trim().length > 0, value: title },
                { label: 'Cover image',     ok: !!coverImage, value: coverImage ? 'Uploaded' : 'Missing (optional)' },
                { label: 'Sections',        ok: blocks.length > 0 && blocks.every(b => b.body.trim().length > 50), value: `${blocks.length} block${blocks.length === 1 ? '' : 's'}` },
                { label: 'Free preview',    ok: blocks.some(b => b.freePreview), value: `${blocks.filter(b => b.freePreview).length} visible to non-buyers` },
              ]}
            />

            <Field
              label="One-off price (pence)"
              sub="0 = Premium-only (no one-off purchase). £49.99/year premium always includes this guide."
            >
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="number"
                  min={0}
                  value={pricePence}
                  onChange={e => setPricePence(Math.max(0, Number(e.target.value) || 0))}
                  className="w-40 text-sm px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                <span className="text-sm text-gray-500">= £{(pricePence / 100).toFixed(2)}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {GUIDE_PRICE_TIERS.map(tier => (
                    <button
                      key={tier.pricePence}
                      type="button"
                      onClick={() => setPricePence(tier.pricePence)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-colors ${
                        pricePence === tier.pricePence
                          ? 'text-brand-700 bg-brand-50 border-brand-200'
                          : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className={`text-xs mt-2 ${stripePriceIdForPence(pricePence) || pricePence === 0 ? 'text-gray-500' : 'text-amber-700'}`}>
                {pricePence === 0
                  ? 'Premium-only, no Stripe price needed.'
                  : stripePriceIdForPence(pricePence)
                    ? `Stripe price auto-wired on save (${stripePriceIdForPence(pricePence)}).`
                    : 'Custom price, no matching Stripe tier. Existing Stripe price stays as-is. Add a tier to src/lib/stripe-price-tiers.ts to auto-wire it.'}
              </p>
            </Field>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-gray-900">Preview the guide</p>
                <p className="text-xs text-gray-500 mt-0.5">Opens in a new tab. Saves first so you see your latest edits.</p>
              </div>
              <button
                type="button"
                onClick={openPreview}
                disabled={saveState === 'saving'}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-md disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" /> Open preview
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => saveAll()}
                disabled={saveState === 'saving'}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-700 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                Save draft only
              </button>
              <button
                onClick={publish}
                disabled={saveState === 'saving' || regenState === 'working' || !title.trim()}
                className="flex-1 btn-primary justify-center !text-sm !py-3 disabled:opacity-50"
              >
                {regenState === 'working'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing &amp; building download…</>
                  : <>Publish guide <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </div>

            {/* Standalone "regenerate" — useful after editing the
                body via /preview, or after an About Us change. */}
            <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-semibold text-gray-900">Offline download file</p>
                <p className="text-xs text-gray-500 mt-0.5">Rebuilt in your browser and saved to storage. Buyers stream this file at download time.</p>
              </div>
              <button
                type="button"
                onClick={regenerateDownloadFile}
                disabled={regenState === 'working'}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-md disabled:opacity-50 shrink-0"
              >
                {regenState === 'working' && <><Loader2 className="w-4 h-4 animate-spin" /> Building…</>}
                {regenState === 'done'    && <><Check className="w-4 h-4" /> Saved</>}
                {(regenState === 'idle' || regenState === 'error') && <>Refresh download file</>}
              </button>
            </div>
            {regenError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">Download file: {regenError}</p>
            )}

            {saveError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom nav (steps 1-3) */}
      {step < TOTAL_STEPS && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3 z-20">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2.5"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance() || saveState === 'saving'}
              className="btn-primary !py-3 !px-6 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveState === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Next <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function Header({ step, icon, children }: { step: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 flex items-center gap-1.5">
        {icon} Step {step} of {TOTAL_STEPS}
      </p>
      <h1 className="text-3xl font-bold text-gray-900 leading-tight">{children}</h1>
    </div>
  )
}

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function SaveIndicator({
  state, error, onRetry,
}: { state: SaveState; error: string | null; onRetry: () => void }) {
  if (state === 'saving') return <span className="text-gray-500 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>
  if (state === 'saved')  return <span className="text-brand-700 inline-flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>
  if (state === 'error')  return (
    <button onClick={onRetry} className="text-red-700 hover:underline inline-flex items-center gap-1" title={error ?? undefined}>
      Save failed, retry
    </button>
  )
  return <span className="text-gray-400">All changes saved</span>
}

function CopyableBlock({ prompt, label }: { prompt: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500">{label}</p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md"
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>
      <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
          Show prompt
        </summary>
        <pre className="text-xs text-gray-700 px-4 pb-4 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-72 overflow-y-auto">{prompt}</pre>
      </details>
    </div>
  )
}

function AddBlockBar({ onAdd }: { onAdd: (kind: GuideBlockKind) => void }) {
  const kinds: GuideBlockKind[] = ['intro', 'destination', 'themed', 'list', 'closing']
  return (
    <div>
      <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-2.5 text-center">Add a section</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {kinds.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => onAdd(k)}
            className="text-left px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-brand-400 hover:bg-brand-50 transition-colors"
            title={KIND_LABELS[k].hint}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Plus className="w-3.5 h-3.5 text-brand-600" /> {KIND_LABELS[k].label}
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">{KIND_LABELS[k].hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

type BlockCardProps = {
  index: number
  total: number
  guideTitle: string
  scope: string
  block: WizardBlock
  onPatch: (patch: Partial<WizardBlock>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onSave: () => void
}

function BlockCard({
  index, total, guideTitle, scope, block, onPatch, onRemove, onMoveUp, onMoveDown, onSave,
}: BlockCardProps) {
  const [open, setOpen] = useState(!block.body)
  const prompt = buildBlockPrompt({
    kind: block.kind,
    heading: block.heading || '<section heading>',
    guideTitle: guideTitle || '<guide title>',
    scope: scope || null,
    notes: block.notes,
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 text-brand-700 text-sm font-bold shrink-0">
          {index + 1}
        </span>
        <input
          value={block.heading}
          onChange={e => onPatch({ heading: e.target.value })}
          placeholder="Section heading"
          className="flex-1 min-w-[12rem] text-base font-semibold text-gray-900 border-0 focus:outline-none bg-transparent"
        />
        <select
          value={block.kind}
          onChange={e => onPatch({ kind: e.target.value as GuideBlockKind })}
          className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          title="Changes which AI prompt template is suggested"
        >
          {(['intro','destination','themed','list','closing'] as GuideBlockKind[]).map(k => (
            <option key={k} value={k}>{KIND_LABELS[k].label}</option>
          ))}
        </select>
        <button
          onClick={() => onPatch({ freePreview: !block.freePreview })}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-md border ${
            block.freePreview
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}
          title={block.freePreview ? 'Visible to non-buyers' : 'Paywalled'}
        >
          {block.freePreview ? <><Eye className="w-3.5 h-3.5" /> Free</> : <><EyeOff className="w-3.5 h-3.5" /> Paid</>}
        </button>
        <button onClick={onMoveUp} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">
          <ChevronUp className="w-4 h-4" />
        </button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">
          <ChevronDown className="w-4 h-4" />
        </button>
        <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-600" title="Remove">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={() => setOpen(o => !o)} className="text-xs font-semibold text-brand-700">
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {open && (
        <div className="p-5 space-y-5">
          <Field
            label="Your raw notes"
            sub="Bullet points, quotes, prices, anything. The AI turns it into the section body. Empty is fine, the AI will write a brief version from common knowledge."
          >
            <textarea
              value={block.notes}
              onChange={e => onPatch({ notes: e.target.value })}
              rows={8}
              placeholder="Stayed: Sujeewa Apartment, £17.66/night for 29 nights. Loved the location. Ate: Nilu, local curry £2. Mr Taco. Activities: turtle snorkelling at Dikwella…"
              className="w-full text-sm px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />
          </Field>

          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
            <span>The AI prompt below uses the heading <strong className="text-gray-800">"{block.heading || '(unset)'}"</strong> and the kind <strong className="text-gray-800">{KIND_LABELS[block.kind].label}</strong>. Change either above to retarget it.</span>
          </div>

          <CopyableBlock prompt={prompt} label="AI prompt for this section" />

          <Field label="Paste the AI's response here">
            <textarea
              value={block.body}
              onChange={e => onPatch({ body: e.target.value })}
              onBlur={onSave}
              rows={16}
              spellCheck={false}
              placeholder={'## …\n\n…'}
              className="w-full text-sm font-mono text-gray-800 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />
          </Field>
        </div>
      )}
    </div>
  )
}

function ReviewChecklist({ items }: { items: Array<{ label: string; ok: boolean; value?: string }> }) {
  return (
    <ul className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
      {items.map(it => (
        <li key={it.label} className="px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {it.ok ? (
              <Check className="w-4 h-4 text-brand-600" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-amber-400 bg-amber-50" />
            )}
            <span className={it.ok ? 'text-gray-700' : 'text-amber-800 font-medium'}>{it.label}</span>
          </div>
          {it.value && <span className="text-xs text-gray-400 font-mono truncate max-w-[14rem]">{it.value}</span>}
        </li>
      ))}
    </ul>
  )
}
