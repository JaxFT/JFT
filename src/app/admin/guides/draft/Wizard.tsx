'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Camera, Check, Copy, ShieldCheck, Loader2, Upload,
  Plus, Trash2, ChevronDown, ChevronUp, Globe, Sparkles, ListTree,
} from 'lucide-react'
import type {
  GuideRow, GuideSections, GuideDestination, GuideThemedSection,
} from '@/lib/guide-types'
import { genLocalId } from '@/lib/guide-types'
import {
  buildCoverImagePrompt, buildWhyPrompt, buildHighlightsPrompt,
  buildNeedToKnowsPrompt, buildDestinationPrompt,
  buildThemedSectionPrompt, buildFinalThoughtsPrompt,
} from '@/lib/guide-prompts'

const TOTAL_STEPS = 9

type StepNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
const STEP_LABELS: Record<StepNum, string> = {
  1: 'Basics',
  2: 'Cover image',
  3: 'Why this country',
  4: 'Destination highlights',
  5: 'Need to knows',
  6: 'Destinations',
  7: 'Themed sections',
  8: 'Final thoughts',
  9: 'Review & publish',
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

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

  // Sections (paste-back targets)
  const [whyNotes, setWhyNotes] = useState('')
  const [whyBody, setWhyBody] = useState(guide.sections.why?.body ?? '')

  const [highlightsNotes, setHighlightsNotes] = useState('')
  const [highlightsBody, setHighlightsBody] = useState(guide.sections.highlights?.body ?? '')

  const [needsNotes, setNeedsNotes] = useState('')
  const [needsBody, setNeedsBody] = useState(guide.sections.needToKnows?.body ?? '')

  const [destinations, setDestinations] = useState<(GuideDestination & { notes: string })[]>(
    () => (guide.sections.destinations ?? []).map(d => ({ ...d, notes: '' })),
  )
  const [themed, setThemed] = useState<(GuideThemedSection & { notes: string })[]>(
    () => (guide.sections.themedSections ?? []).map(t => ({ ...t, notes: '' })),
  )

  const [finalNotes, setFinalNotes] = useState('')
  const [finalBody, setFinalBody] = useState(guide.sections.finalThoughts?.body ?? '')

  // Wizard navigation
  const [step, setStep] = useState<StepNum>(1)

  // Save state for the auto-save indicator
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Save helpers ────────────────────────────
  // Save the basics + cover + per-section bodies. We do this on user actions
  // (Next, Paste, manual Save) so a closed tab doesn't lose work.
  const saveAll = async (
    overrides?: { status?: 'draft' | 'published' },
  ): Promise<{ ok: true; slug: string } | { ok: false; err: string }> => {
    setSaveState('saving')
    setSaveError(null)
    try {
      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean)
      const sections: GuideSections = {
        why: { body: whyBody },
        highlights: { body: highlightsBody },
        needToKnows: { body: needsBody },
        destinations: destinations
          .map(({ notes: _omit, ...d }) => d)
          .sort((a, b) => a.order - b.order),
        themedSections: themed
          .map(({ notes: _omit, ...t }) => t)
          .sort((a, b) => a.order - b.order),
        finalThoughts: { body: finalBody },
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

  // ── Destinations / Themed CRUD (local state only; persisted on save) ──
  const addDestination = () => {
    setDestinations(prev => [
      ...prev,
      { id: genLocalId(), name: '', body: '', notes: '', order: prev.length },
    ])
  }
  const removeDestination = (id: string) => {
    setDestinations(prev => prev.filter(d => d.id !== id).map((d, i) => ({ ...d, order: i })))
  }
  const patchDestination = (id: string, patch: Partial<typeof destinations[number]>) => {
    setDestinations(prev => prev.map(d => (d.id === id ? { ...d, ...patch } : d)))
  }
  const moveDestination = (id: string, dir: -1 | 1) => {
    setDestinations(prev => {
      const idx = prev.findIndex(d => d.id === id)
      if (idx === -1) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      const [picked] = copy.splice(idx, 1)
      copy.splice(target, 0, picked)
      return copy.map((d, i) => ({ ...d, order: i }))
    })
  }

  const addThemed = () => {
    setThemed(prev => [
      ...prev,
      { id: genLocalId(), title: '', body: '', notes: '', order: prev.length },
    ])
  }
  const removeThemed = (id: string) => {
    setThemed(prev => prev.filter(t => t.id !== id).map((t, i) => ({ ...t, order: i })))
  }
  const patchThemed = (id: string, patch: Partial<typeof themed[number]>) => {
    setThemed(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
  }

  // ── Cover upload (reuses the blog photo upload endpoint) ──
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

  // ── Validation per step ────────────────────────────
  const canAdvance = (): boolean => {
    if (step === 1) return title.trim().length > 0 && country.trim().length > 0
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

  const publish = async () => {
    const res = await saveAll({ status: 'published' })
    if (res.ok) router.push('/admin/guides')
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
              Title, country, and pricing for this guide. You can change any of it later.
            </p>

            <Field label="Title">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. The Real Vietnam Family Guide"
                className="w-full text-lg px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Field>

            <Field label="Country">
              <input
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="e.g. Vietnam"
                className="w-full text-lg px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Field>

            <Field label="Subtitle" sub="One line that appears under the title on the listing card.">
              <input
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="e.g. A practical, no-fluff guide to travelling Vietnam with kids."
                className="w-full text-base px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tags (comma-separated)">
                <input
                  value={tagsText}
                  onChange={e => setTagsText(e.target.value)}
                  placeholder="Asia, Vietnam, Family"
                  className="w-full text-sm px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </Field>

              <Field label="One-off price (pence)" sub="0 = Premium-only (no one-off purchase)">
                <input
                  type="number"
                  min={0}
                  value={pricePence}
                  onChange={e => setPricePence(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full text-sm px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">£{(pricePence / 100).toFixed(2)}</p>
              </Field>
            </div>
          </div>
        )}

        {/* STEP 2: Cover image */}
        {step === 2 && (
          <div className="space-y-6">
            <Header step={2} icon={<Sparkles className="w-3.5 h-3.5" />}>
              Cover image
            </Header>
            <p className="text-gray-500 text-base">
              Copy the prompt below, paste into Midjourney / DALL-E / your image tool of choice, then upload the result. Style is locked to match the illustrated map look from the Sri Lanka guide.
            </p>

            <CopyableBlock
              prompt={buildCoverImagePrompt({ country: country || '<country>', title: title || '<title>' })}
              label="Image generation prompt"
            />

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

        {/* STEP 3: Why this country */}
        {step === 3 && (
          <PromptedSectionStep
            stepNum={3}
            heading="Why this country"
            blurb={`Why ${country || 'this country'} works as a family destination. Include what surprised you, what worked with kids, what scared you that turned out fine.`}
            notes={whyNotes}
            setNotes={setWhyNotes}
            body={whyBody}
            setBody={setWhyBody}
            promptBuilder={() => buildWhyPrompt({ country: country || '<country>', title, notes: whyNotes })}
            placeholder="We were worried about food spice / chaos / kids on long flights. What we found instead was… Jax loved the elephants. The buses were cheap. People always greeted him with…"
          />
        )}

        {/* STEP 4: Destination highlights */}
        {step === 4 && (
          <PromptedSectionStep
            stepNum={4}
            heading="Destination highlights"
            blurb="Top spots, must-sees, headline experiences. Short and scannable — the AI will format as bullet lists."
            notes={highlightsNotes}
            setNotes={setHighlightsNotes}
            body={highlightsBody}
            setBody={setHighlightsBody}
            promptBuilder={() => buildHighlightsPrompt({ country: country || '<country>', notes: highlightsNotes })}
            placeholder="Top spots: Hoi An — best family base. Hanoi — culture, food, world schooling. Sapa — mountains, trekking. Must-sees: Hoi An lantern festival, Ha Long Bay cruise, Mekong Delta…"
          />
        )}

        {/* STEP 5: Need to knows */}
        {step === 5 && (
          <PromptedSectionStep
            stepNum={5}
            heading="Need to knows"
            blurb="Visa, SIM, money, mosquitoes, spice, alcohol rules — the stuff you wish you'd known before arriving. Include specific brands and exact prices where you have them."
            notes={needsNotes}
            setNotes={setNeedsNotes}
            body={needsBody}
            setBody={setNeedsBody}
            promptBuilder={() => buildNeedToKnowsPrompt({ country: country || '<country>', notes: needsNotes })}
            placeholder="Visa: 30-day e-visa $25 each. SIM: Viettel — local SIM way better than eSIM. Cash: ATMs charge 80,000 VND. Starling no fee. Mosquitoes: bad in Mekong, fine in Hanoi…"
            tall
          />
        )}

        {/* STEP 6: Destinations */}
        {step === 6 && (
          <div className="space-y-6">
            <Header step={6} icon={<Globe className="w-3.5 h-3.5" />}>
              Destinations
            </Header>
            <p className="text-gray-500 text-base">
              Add a block for every destination you want a full chapter for. Each one gets its own AI prompt so you can do them one at a time.
            </p>

            {destinations.length === 0 && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                <p className="text-sm text-gray-500 mb-4">No destinations yet.</p>
                <button onClick={addDestination} className="btn-primary !py-2 !px-4 !text-sm">
                  <Plus className="w-4 h-4" /> Add first destination
                </button>
              </div>
            )}

            {destinations.map((d, idx) => (
              <DestinationCard
                key={d.id}
                index={idx}
                total={destinations.length}
                country={country}
                destination={d}
                onPatch={patch => patchDestination(d.id, patch)}
                onRemove={() => removeDestination(d.id)}
                onMoveUp={() => moveDestination(d.id, -1)}
                onMoveDown={() => moveDestination(d.id, 1)}
                onSave={() => saveAll()}
              />
            ))}

            {destinations.length > 0 && (
              <button
                onClick={addDestination}
                className="w-full bg-white border-2 border-dashed border-brand-300 hover:border-brand-500 hover:bg-brand-50 rounded-2xl py-4 flex items-center justify-center gap-2 text-brand-700 font-semibold text-sm"
              >
                <Plus className="w-4 h-4" /> Add another destination
              </button>
            )}
          </div>
        )}

        {/* STEP 7: Themed sections */}
        {step === 7 && (
          <div className="space-y-6">
            <Header step={7} icon={<ListTree className="w-3.5 h-3.5" />}>
              Themed sections (optional)
            </Header>
            <p className="text-gray-500 text-base">
              Cross-cutting chapters like "Choosing the right safari", "Places to avoid", "Renting a tuk-tuk". Skip this step if you don't need any.
            </p>

            {themed.length === 0 && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                <p className="text-sm text-gray-500 mb-4">No themed sections yet — totally optional.</p>
                <button onClick={addThemed} className="btn-primary !py-2 !px-4 !text-sm">
                  <Plus className="w-4 h-4" /> Add themed section
                </button>
              </div>
            )}

            {themed.map((t, idx) => (
              <ThemedCard
                key={t.id}
                index={idx}
                country={country}
                section={t}
                onPatch={patch => patchThemed(t.id, patch)}
                onRemove={() => removeThemed(t.id)}
                onSave={() => saveAll()}
              />
            ))}

            {themed.length > 0 && (
              <button
                onClick={addThemed}
                className="w-full bg-white border-2 border-dashed border-brand-300 hover:border-brand-500 hover:bg-brand-50 rounded-2xl py-4 flex items-center justify-center gap-2 text-brand-700 font-semibold text-sm"
              >
                <Plus className="w-4 h-4" /> Add another themed section
              </button>
            )}
          </div>
        )}

        {/* STEP 8: Final thoughts */}
        {step === 8 && (
          <PromptedSectionStep
            stepNum={8}
            heading="Final thoughts"
            blurb="The closing reflection. What did this country ask of you as a family? What would you tell another family considering it?"
            notes={finalNotes}
            setNotes={setFinalNotes}
            body={finalBody}
            setBody={setFinalBody}
            promptBuilder={() => buildFinalThoughtsPrompt({ country: country || '<country>', notes: finalNotes })}
            placeholder="Slow down, let the route evolve, say yes to invitations. The kids who ran across the rice fields. The first time Jax tried to count in Vietnamese…"
          />
        )}

        {/* STEP 9: Review & publish */}
        {step === 9 && (
          <div className="space-y-6">
            <Header step={9} icon={<Check className="w-3.5 h-3.5" />}>
              Review & publish
            </Header>
            <p className="text-gray-500 text-base">
              Everything is saved as a draft. Click <strong>Publish</strong> to make this guide live, or come back later via Admin → Guides.
            </p>

            <ReviewChecklist
              items={[
                { label: 'Title', ok: title.trim().length > 0, value: title },
                { label: 'Country', ok: country.trim().length > 0, value: country },
                { label: 'Cover image', ok: !!coverImage, value: coverImage ? 'Uploaded' : 'Missing' },
                { label: 'Why ' + (country || 'country'), ok: whyBody.trim().length > 100, value: `${whyBody.trim().length} chars` },
                { label: 'Highlights', ok: highlightsBody.trim().length > 50, value: `${highlightsBody.trim().length} chars` },
                { label: 'Need to knows', ok: needsBody.trim().length > 100, value: `${needsBody.trim().length} chars` },
                { label: 'Destinations', ok: destinations.length > 0 && destinations.every(d => d.body.trim().length > 100), value: `${destinations.length} destination${destinations.length === 1 ? '' : 's'}` },
                { label: 'Final thoughts', ok: finalBody.trim().length > 50, value: `${finalBody.trim().length} chars` },
              ]}
            />

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
                disabled={saveState === 'saving' || !title.trim() || !country.trim()}
                className="flex-1 btn-primary justify-center !text-sm !py-3 disabled:opacity-50"
              >
                Publish guide <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {saveError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom nav (steps 1-8) */}
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
      Save failed — retry
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

type PromptedSectionStepProps = {
  stepNum: StepNum
  heading: string
  blurb: string
  notes: string
  setNotes: (v: string) => void
  body: string
  setBody: (v: string) => void
  promptBuilder: () => string
  placeholder: string
  tall?: boolean
}

function PromptedSectionStep({
  stepNum, heading, blurb, notes, setNotes, body, setBody, promptBuilder, placeholder, tall,
}: PromptedSectionStepProps) {
  return (
    <div className="space-y-6">
      <Header step={stepNum} icon={<Sparkles className="w-3.5 h-3.5" />}>{heading}</Header>
      <p className="text-gray-500 text-base">{blurb}</p>

      <Field label="Your raw notes" sub="Bullet points, quotes, prices, anything you remember. The AI turns it into the section.">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={tall ? 12 : 8}
          placeholder={placeholder}
          className="w-full text-sm px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
        />
      </Field>

      <CopyableBlock prompt={promptBuilder()} label="AI prompt — copy this" />

      <Field label="Paste the AI's response here" sub="The markdown the AI gives you. You can edit it any time.">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={tall ? 18 : 14}
          placeholder={'## …\n\n…'}
          spellCheck={false}
          className="w-full text-sm font-mono text-gray-800 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
        />
      </Field>
    </div>
  )
}

type DestinationCardProps = {
  index: number
  total: number
  country: string
  destination: GuideDestination & { notes: string }
  onPatch: (patch: Partial<GuideDestination & { notes: string }>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onSave: () => void
}

function DestinationCard({
  index, total, country, destination, onPatch, onRemove, onMoveUp, onMoveDown, onSave,
}: DestinationCardProps) {
  const [open, setOpen] = useState(!destination.body)
  const prompt = buildDestinationPrompt({
    country: country || '<country>',
    destinationName: destination.name || '<destination>',
    notes: destination.notes,
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 text-brand-700 text-sm font-bold">
          {index + 1}
        </span>
        <input
          value={destination.name}
          onChange={e => onPatch({ name: e.target.value })}
          placeholder="Destination name (e.g. Hoi An)"
          className="flex-1 text-base font-semibold text-gray-900 border-0 focus:outline-none bg-transparent"
        />
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
          <Field label="Your notes for this destination" sub="Hotel name + price, restaurants, activities, prices, what worked with kids, discount codes…">
            <textarea
              value={destination.notes}
              onChange={e => onPatch({ notes: e.target.value })}
              rows={8}
              placeholder={'Stayed: Sujeewa Apartment, £17.66/night for 29 nights. Loved the location. Ate: Nilu — local curry £2. Mr Taco. Activities: turtle snorkelling at Dikwella. Surfed at Lucky\'s Surf School…'}
              className="w-full text-sm px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />
          </Field>

          <CopyableBlock prompt={prompt} label="AI prompt for this destination" />

          <Field label="Paste the AI's response here">
            <textarea
              value={destination.body}
              onChange={e => onPatch({ body: e.target.value })}
              onBlur={onSave}
              rows={16}
              spellCheck={false}
              placeholder={'### What ' + (destination.name || 'this place') + ' is like\n\n…'}
              className="w-full text-sm font-mono text-gray-800 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />
          </Field>
        </div>
      )}
    </div>
  )
}

type ThemedCardProps = {
  index: number
  country: string
  section: GuideThemedSection & { notes: string }
  onPatch: (patch: Partial<GuideThemedSection & { notes: string }>) => void
  onRemove: () => void
  onSave: () => void
}

function ThemedCard({ index, country, section, onPatch, onRemove, onSave }: ThemedCardProps) {
  const prompt = buildThemedSectionPrompt({
    country: country || '<country>',
    title: section.title || '<title>',
    notes: section.notes,
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 text-brand-700 text-sm font-bold">
          {index + 1}
        </span>
        <input
          value={section.title}
          onChange={e => onPatch({ title: e.target.value })}
          placeholder="Section title (e.g. Choosing the right safari)"
          className="flex-1 text-base font-semibold text-gray-900 border-0 focus:outline-none bg-transparent"
        />
        <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-600" title="Remove">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <Field label="Your notes for this section">
          <textarea
            value={section.notes}
            onChange={e => onPatch({ notes: e.target.value })}
            rows={7}
            placeholder="What this section should cover. Specific examples, comparisons, prices, our opinion…"
            className="w-full text-sm px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
          />
        </Field>

        <CopyableBlock prompt={prompt} label="AI prompt for this section" />

        <Field label="Paste the AI's response here">
          <textarea
            value={section.body}
            onChange={e => onPatch({ body: e.target.value })}
            onBlur={onSave}
            rows={14}
            spellCheck={false}
            className="w-full text-sm font-mono text-gray-800 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
          />
        </Field>
      </div>
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
