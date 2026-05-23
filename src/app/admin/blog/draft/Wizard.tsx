'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Camera, Check, Copy, Loader2, ShieldCheck, Star,
  Trash2, X, ChevronUp, ChevronDown, Sparkles, Plus, Link as LinkIcon,
} from 'lucide-react'
import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/blog-categories'
import {
  type TravelStage, type BlogTopic,
  TRAVEL_STAGE_LABEL, BLOG_TOPIC_LABEL,
} from '@/lib/blog-meta'
import { VOICE_PROFILE } from '@/lib/voice-profile'
import { resizeImageIfLarge } from '@/lib/image-resize'
import TaggingFields from '@/components/admin/blog/TaggingFields'
import { getPackMeta } from '@/lib/adventurePackMeta'

type Photo = {
  id: string
  status: 'uploading' | 'done' | 'error'
  url?: string
  caption: string
  isCover: boolean
  error?: string
}

type WizardLink = { id: string; url: string; label: string }

const VIBES = [
  'warm and honest',
  'funny',
  'practical',
  'reflective',
  'family chaos',
  'food-focused',
  'logistical',
]

const WORDS_PER_MIN = 200
const MAX_MINUTES = 20

function wordTargetForMinutes(min: number): { lo: number; hi: number; cap: number; structureHint: string } {
  const safeMin = Math.max(1, Math.min(MAX_MINUTES, Math.round(min)))
  const hi = safeMin * WORDS_PER_MIN
  const lo = Math.max(120, hi - Math.round(WORDS_PER_MIN * 0.4))
  const cap = Math.round(hi * 1.15)
  const structureHint =
    safeMin <= 2 ? 'No sub-headings. Flowing paragraphs only. Stop the moment the story is told.'
    : safeMin <= 4 ? 'One or two ## sub-headings if they earn their place. Otherwise paragraphs.'
    : safeMin <= 8 ? 'Two to four ## sub-headings, each opening with a clear point. A short bullet list of practical tips at the end is fine.'
    : 'Three to six ## sub-headings. Use ### inside them if needed. A practical-tips bullet block at the end is welcome.'
  return { lo, hi, cap, structureHint }
}

const TOTAL_STEPS = 6

const CATEGORY_LABEL: Record<BlogCategory, string> =
  Object.fromEntries(BLOG_CATEGORIES.map(c => [c.value, c.label])) as Record<BlogCategory, string>

const LINK_CTA_HINTS: Record<BlogCategory, string> = {
  accommodation: '"book here", "see availability", "check rates", "their website"',
  restaurant:    '"see the menu", "book a table", "find them here", "their website"',
  bar:           '"find them here", "see what they pour", "their website"',
  activity:      '"book tickets", "check opening times", "more on their website", "their website"',
  general:       '"more here", "their website", "see the full details"',
}

// Friendly label suggestions for the link "label" field, by category.
function suggestedLabelsFor(category: BlogCategory | ''): string[] {
  switch (category) {
    case 'accommodation': return ['Booking', 'Their website', 'Airbnb listing']
    case 'restaurant':    return ['Menu', 'Booking', 'Instagram', 'Their website']
    case 'bar':           return ['Their website', 'Instagram', 'Menu']
    case 'activity':      return ['Booking', 'Tickets', 'Opening times', 'Their website']
    default:              return ['Website', 'Menu', 'Booking', 'Instagram']
  }
}

function newLink(label = ''): WizardLink {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, url: '', label }
}

export default function Wizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState<BlogCategory | ''>('')
  const [placeName, setPlaceName] = useState('')
  const [links, setLinks] = useState<WizardLink[]>([])
  const [location, setLocation] = useState('')
  const [about, setAbout] = useState('')
  const [tripDate, setTripDate] = useState<string>('')   // yyyy-mm
  const [detail, setDetail] = useState('')
  const [vibes, setVibes] = useState<string[]>([])
  const [targetMinutes, setTargetMinutes] = useState<number>(3)
  // Structured tagging fields (see blog-meta.ts). Required at publish
  // time, but we let the writer pick them here during step 2 — they
  // also enrich the AI prompt with the destination + stage hints.
  const [travelStages, setTravelStages] = useState<TravelStage[]>([])
  const [destinationCountry, setDestinationCountry] = useState<string | null>(null)
  // Did the writer explicitly pick a destination (even "none")? We
  // can't distinguish "null = not chosen" from "null = chose 'no
  // specific destination'" by value alone, so we track the explicit
  // tick separately for the "required at progression" check.
  const [destinationPicked, setDestinationPicked] = useState(false)
  const [topics, setTopics] = useState<BlogTopic[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [aiResponse, setAiResponse] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categoryConfig = BLOG_CATEGORIES.find(c => c.value === category) ?? null
  const placeNameRequired = category !== '' && category !== 'general'
  const placePromptLabel = categoryConfig?.placePrompt ?? 'Place name (optional)'

  const toggleVibe = (v: string) => {
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  // ── Link CRUD ──
  const addLink = (label?: string) => setLinks(prev => [...prev, newLink(label ?? '')])
  const patchLink = (id: string, patch: Partial<WizardLink>) =>
    setLinks(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)))
  const removeLink = (id: string) => setLinks(prev => prev.filter(l => l.id !== id))

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const newPhotos: Photo[] = Array.from(files).map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      status: 'uploading',
      caption: '',
      isCover: false,
    }))
    setPhotos(prev => [...prev, ...newPhotos])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const photoId = newPhotos[i].id
      try {
        const { file: prepared } = await resizeImageIfLarge(file)
        const form = new FormData()
        form.append('file', prepared)
        const res = await fetch('/api/admin/blog-photos/upload', { method: 'POST', body: form })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
        setPhotos(prev => prev.map(p =>
          p.id === photoId ? { ...p, status: 'done', url: body.url } : p,
        ))
      } catch (e) {
        setPhotos(prev => prev.map(p =>
          p.id === photoId
            ? { ...p, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' }
            : p,
        ))
      }
    }
  }

  const removePhoto = (id: string) => setPhotos(prev => prev.filter(p => p.id !== id))
  const setCaption = (id: string, caption: string) =>
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p))
  const toggleCover = (id: string) =>
    setPhotos(prev => prev.map(p => ({ ...p, isCover: p.id === id ? !p.isCover : false })))
  const movePhoto = (id: string, dir: -1 | 1) => {
    setPhotos(prev => {
      const idx = prev.findIndex(p => p.id === id)
      if (idx === -1) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      const [picked] = copy.splice(idx, 1)
      copy.splice(target, 0, picked)
      return copy
    })
  }

  const allPhotosReady = photos.every(p => p.status !== 'uploading')
  const doneCount = photos.filter(p => p.status === 'done').length

  const today = new Date().toISOString().slice(0, 10)
  const donePhotos = photos.filter(p => p.status === 'done')
  const coverPhoto = donePhotos.find(p => p.isCover)
  const bodyPhotos = donePhotos.filter(p => !p.isCover)
  const lengthCfg = wordTargetForMinutes(targetMinutes)
  const cleanLinks = links.filter(l => l.url.trim().length > 0)

  // Format trip date for the prompt, accept either yyyy-mm-dd or yyyy-mm.
  const tripDateHuman = (() => {
    if (!tripDate) return ''
    if (/^\d{4}-\d{2}$/.test(tripDate)) {
      const [y, m] = tripDate.split('-')
      const date = new Date(Number(y), Number(m) - 1, 1)
      return date.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) {
      return new Date(tripDate).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    }
    return tripDate
  })()

  // Build the links block for the AI prompt.
  const linksPromptBlock = (() => {
    if (cleanLinks.length === 0) return 'LINKS: none, do not invent any URLs.'
    const cta = category ? LINK_CTA_HINTS[category] : LINK_CTA_HINTS.general
    const lines = cleanLinks
      .map((l, i) => `  ${i + 1}. URL: ${l.url}\n     Purpose: ${l.label || 'Website'}`)
      .join('\n')
    return `LINKS, IMPORTANT: weave each of these links into the post body ONCE, where it fits naturally. Embed each one inside a short call-to-action phrase using markdown \`[phrase](URL)\` syntax. DO NOT show URLs as raw text. DO NOT use the place name as the link text. Pick CTA phrasing that matches the link's "Purpose" (good options for this post type: ${cta}). For example, a link with Purpose "Menu" should read like "[see the menu](URL)"; "Booking" → "[book here](URL)"; "Instagram" → "[their Instagram](URL)". Place each link in a different spot in the post, don't bunch them together.

${lines}`
  })()

  const builtPrompt = `${VOICE_PROFILE}

TASK: Write one blog post for JaxFamilyTravels.com using the voice profile above. Everything below is the brief.

POST DETAILS:
Type of post: ${category ? CATEGORY_LABEL[category] : 'not specified'}
Location: ${location || 'not specified'}
Destination country (matches our country pack catalogue): ${destinationCountry ? (getPackMeta(destinationCountry)?.country ?? destinationCountry) : 'none / general post'}
Travel stage of the reader (use this to pitch the post — a "Dreaming" reader wants atmosphere; a "Planning" reader wants logistics): ${travelStages.length > 0 ? travelStages.map(s => TRAVEL_STAGE_LABEL[s]).join(', ') : 'not specified'}
Topic buckets this post belongs to: ${topics.length > 0 ? topics.map(t => BLOG_TOPIC_LABEL[t]).join(', ') : 'not specified'}
What this post is about: ${about || 'not specified'}
${tripDateHuman ? `When we visited: ${tripDateHuman}` : 'When we visited: not specified'}
${placeName.trim()
  ? `Name to feature in the post (mention this by name early in the body): ${placeName.trim()}`
  : 'Name to feature: none, write generally about the location.'}
What actually happened (raw notes from Bec/Oli): ${detail || 'none'}
Tone/vibe modifiers (use sparingly, voice profile wins): ${vibes.length ? vibes.join(', ') : 'warm and honest'}

${linksPromptBlock}

LENGTH, STRICT CAP, NOT A GOAL:
Target: about ${targetMinutes} minute read (~${lengthCfg.lo}–${lengthCfg.hi} words at normal reading speed).
HARD CEILING: ${lengthCfg.cap} words. Going over is a failure. Going under is fine.
${lengthCfg.structureHint}

If you find yourself writing more, STOP. Don't pad. Specifically forbidden waffle:
- Generic atmospheric scene-setting at the start (start with the actual moment).
- "What we learned" / "this taught us" / "if there's one thing we'd say…" reflections at the end.
- Re-explaining what just happened in different words.
- Adding context the reader didn't ask for.
- "And speaking of…" or "On a similar note…" linker sentences.
- Sentences whose job is to introduce the next sentence.
A tight ${lengthCfg.lo}-word post beats a padded ${lengthCfg.cap}-word post every time.

${coverPhoto
  ? `COVER PHOTO (put this URL in the coverImage frontmatter field; do NOT also place it in the body):
${coverPhoto.url}
Cover caption: ${coverPhoto.caption || '(no caption)'}`
  : 'COVER PHOTO: none selected, leave the coverImage frontmatter field empty.'}

${bodyPhotos.length === 0
  ? 'PHOTOS IN THE BODY: none beyond the cover.'
  : `PHOTOS IN THE BODY, IMPORTANT, you MUST place them IN THE EXACT ORDER LISTED below. Do not reorder. Photo 1 appears before photo 2, which appears before photo 3, etc. Spread them through the body so they don't all sit at the top or bottom. Each photo gets its own line using markdown image syntax: \`![caption](URL)\`.

${bodyPhotos.map((p, i) => `  ${i + 1}. ${p.url}
     Caption: ${p.caption || '(no caption, pick a natural moment that fits where this photo lands)'}`).join('\n')}`}

OUTPUT FORMAT, IMPORTANT: Return the entire blog post WRAPPED IN A SINGLE TRIPLE-BACKTICK CODE BLOCK so I can copy the raw text. Like this:

\`\`\`
---
title: "<specific title, not a generic one>"
excerpt: "<one sentence hook for the blog listing, ~25 words>"
date: "${today}"
author: "Jax Family Travels"
coverImage: "${coverPhoto?.url ?? ''}"
tags: ["<3 to 5 short tags, e.g. Country, Region, Theme>"]
---

<Body in markdown, within the word cap above. Mama and Papa, never Mum or Dad. Jax is 8 and has real opinions, not toddler tropes.>
\`\`\`

Do NOT add any text before or after the code block. The code block IS the entire response.`

  const canAdvance = () => {
    if (step === 1) {
      if (!category) return false
      if (placeNameRequired && !placeName.trim()) return false
      return true
    }
    // Stage + destination are required to make the structured filters
    // useful. Destination can be null (general post), but the writer
    // has to have explicitly picked it (otherwise we treat it as
    // "not yet chosen" and block progression).
    if (step === 2) {
      return Boolean(location.trim() && about.trim() && travelStages.length > 0 && destinationPicked)
    }
    if (step === 3) return detail.trim()
    if (step === 4) return allPhotosReady
    return true
  }

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS))
  const back = () => setStep(s => Math.max(s - 1, 1))

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(builtPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveDraft = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      // Convert trip date to yyyy-mm-dd if it's yyyy-mm (use first of month).
      const tripDateIso = /^\d{4}-\d{2}$/.test(tripDate) ? `${tripDate}-01`
        : /^\d{4}-\d{2}-\d{2}$/.test(tripDate) ? tripDate : null

      const res = await fetch('/api/admin/blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: aiResponse.trim(),
          category: category || null,
          place_name: placeName.trim() || null,
          // Keep place_link for back-compat: first link if any.
          place_link: cleanLinks[0]?.url ?? null,
          links: cleanLinks.map(l => ({ url: l.url, label: l.label || 'Website' })),
          trip_date: tripDateIso,
          target_minutes: targetMinutes,
          travel_stages: travelStages,
          destination_country: destinationCountry,
          topics,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      router.push(`/admin/blog/${body.id}/edit?new=1`)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  const suggestedLabels = suggestedLabelsFor(category)

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Top bar */}
      <div className="sticky top-16 z-10 bg-sand-50/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/admin/blog" className="text-gray-500 hover:text-gray-900 -ml-1 p-2">
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
          <span className="text-xs text-gray-500 font-medium tabular-nums">{step}/{TOTAL_STEPS}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-32">

        {/* STEP 1: What kind of post + place + links */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Step 1 of {TOTAL_STEPS}
              </p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">What kind of post is this?</h1>
              <p className="text-gray-500 mt-2 text-base">Pick the type, name the place, and add any links (booking, menu, etc).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Post type</label>
              <div className="grid grid-cols-1 gap-2">
                {BLOG_CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                      category === c.value
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                    }`}
                  >
                    <span className="font-semibold">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {placePromptLabel}
                {placeNameRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                value={placeName}
                onChange={e => setPlaceName(e.target.value)}
                placeholder={
                  category === 'accommodation' ? 'e.g. Casa Fuzetta, Olhão'
                  : category === 'restaurant' ? 'e.g. Kedai Kopi Heng Huat'
                  : category === 'bar' ? 'e.g. The Tippling Club'
                  : category === 'activity' ? 'e.g. Sigiriya Rock'
                  : 'e.g. Marrakech (optional for general posts)'
                }
                autoComplete="off"
                className="w-full text-lg px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Links (optional)</label>
                <button
                  type="button"
                  onClick={() => addLink()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Add link
                </button>
              </div>
              {links.length === 0 && (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-3">No links yet. Each link gets a short label so the AI knows how to phrase it in the post.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedLabels.map(lbl => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => addLink(lbl)}
                        className="text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-brand-100 hover:text-brand-800 px-3 py-1.5 rounded-full"
                      >
                        + {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {links.map((l, i) => (
                  <div key={l.id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <input
                        value={l.label}
                        onChange={e => patchLink(l.id, { label: e.target.value })}
                        placeholder="Label (Booking, Menu, Instagram…)"
                        list={`labels-${l.id}`}
                        className="flex-1 text-sm font-semibold text-gray-800 border-0 focus:outline-none bg-transparent min-w-0"
                      />
                      <datalist id={`labels-${l.id}`}>
                        {suggestedLabels.map(lbl => <option key={lbl} value={lbl} />)}
                      </datalist>
                      <button
                        type="button"
                        onClick={() => removeLink(l.id)}
                        className="p-1 text-gray-400 hover:text-red-600 shrink-0"
                        aria-label="Remove link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <input
                        value={l.url}
                        onChange={e => patchLink(l.id, { url: e.target.value })}
                        placeholder="https://…"
                        inputMode="url"
                        autoComplete="off"
                        className="flex-1 text-sm font-mono text-gray-700 border-0 focus:outline-none bg-transparent min-w-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {links.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">The label tells the AI how to phrase the link in the post (e.g. "Booking" becomes "book here", "Menu" becomes "see the menu").</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Trip basics + when we went */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 2 of {TOTAL_STEPS}</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Where, when, and what's this post about?</h1>
              <p className="text-gray-500 mt-2 text-base">Keep it short, single line is fine.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Galle, Sri Lanka"
                autoComplete="off"
                className="w-full text-lg px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">Free-text location (city / region / "Mediterranean coast"). The structured country goes below.</p>
            </div>

            {/* Structured tagging — drives the /blog filters and SEO hubs. */}
            <div className="bg-sand-50 border border-gray-200 rounded-2xl p-5">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">How does this post fit the site?</p>
              <TaggingFields
                travelStages={travelStages}
                onTravelStagesChange={setTravelStages}
                destinationCountry={destinationCountry}
                onDestinationCountryChange={v => { setDestinationCountry(v); setDestinationPicked(true) }}
                topics={topics}
                onTopicsChange={setTopics}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">When did you go?</label>
              <input
                type="month"
                value={tripDate}
                onChange={e => setTripDate(e.target.value)}
                className="w-full text-base px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">Helps the AI write seasonally (weather, prices, what was open). Shown to readers near the byline so they can calibrate.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What's this post about?</label>
              <input
                value={about}
                onChange={e => setAbout(e.target.value)}
                placeholder="e.g. Our week with the kids in Galle Fort"
                autoComplete="off"
                className="w-full text-lg px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        {/* STEP 3: The story */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 3 of {TOTAL_STEPS}</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">What actually happened?</h1>
              <p className="text-gray-500 mt-2 text-base">Raw notes are fine. Anything you remember, quotes, prices, what surprised you, what was hard, what Jax said. The AI will turn it into the post.</p>
            </div>

            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              rows={10}
              placeholder="The day Jax tried curry for breakfast and refused to leave the restaurant…"
              className="w-full text-base px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tone / vibe (tap any that fit)</label>
              <div className="flex flex-wrap gap-2">
                {VIBES.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleVibe(v)}
                    className={`text-sm font-medium px-3.5 py-2 rounded-full border transition-colors ${
                      vibes.includes(v)
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Target read time</label>
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
              <p className="text-xs text-gray-400 mt-2">
                ≈ {lengthCfg.lo}–{lengthCfg.hi} words (hard cap {lengthCfg.cap}). The prompt tells the AI to stop at the cap, not pad to hit it.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Photos */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 4 of {TOTAL_STEPS}</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Photos</h1>
              <p className="text-gray-500 mt-2 text-base">Tap to add photos from your camera roll. Caption each one so the AI puts it in the right spot.</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => addPhotos(e.target.files)}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white border-2 border-dashed border-brand-300 hover:border-brand-500 hover:bg-brand-50 rounded-2xl py-10 flex flex-col items-center gap-2 text-brand-700 transition-colors"
            >
              <Camera className="w-7 h-7" />
              <span className="font-semibold">Add photos</span>
              <span className="text-xs text-gray-500">Camera roll, or take new ones</span>
            </button>

            {photos.length > 0 && (
              <>
                <p className="text-xs text-gray-500 -mb-2">
                  Order matters, photos will appear in the post in the order shown below. Use the arrows to rearrange.
                </p>
                <div className="space-y-4">
                  {photos.map((p, i) => (
                    <div
                      key={p.id}
                      className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition-colors ${
                        p.isCover ? 'border-brand-500' : 'border-transparent'
                      }`}
                    >
                      <div className="aspect-[4/3] bg-gray-100 relative">
                        {p.status === 'uploading' && (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-500 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> Uploading…
                          </div>
                        )}
                        {p.status === 'done' && p.url && (
                          <img loading="lazy" src={p.url} alt={p.caption} className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        {p.status === 'error' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-700 text-sm px-4 text-center">
                            <X className="w-6 h-6 mb-1" /> {p.error}
                          </div>
                        )}
                        {p.isCover ? (
                          <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-brand-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                            <Star className="w-3 h-3 fill-current" /> Cover
                          </div>
                        ) : (
                          <div className="absolute top-2 left-2 inline-flex items-center justify-center min-w-[1.75rem] h-7 bg-black/55 text-white text-xs font-bold rounded-full px-2">
                            #{i + 1}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(p.id)}
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                          aria-label="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-3 space-y-2">
                        <input
                          value={p.caption}
                          onChange={e => setCaption(p.id, e.target.value)}
                          placeholder="Caption (one short sentence)"
                          className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => movePhoto(p.id, -1)}
                            disabled={i === 0}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-2.5 py-2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Move photo up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" /> Up
                          </button>
                          <button
                            type="button"
                            onClick={() => movePhoto(p.id, 1)}
                            disabled={i === photos.length - 1}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-2.5 py-2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Move photo down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" /> Down
                          </button>
                          {p.status === 'done' && (
                            <button
                              type="button"
                              onClick={() => toggleCover(p.id)}
                              className={`flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 transition-colors ${
                                p.isCover
                                  ? 'bg-brand-50 text-brand-800 border border-brand-200'
                                  : 'text-gray-600 border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${p.isCover ? 'fill-current text-brand-600' : ''}`} />
                              {p.isCover ? 'Cover (tap to unset)' : 'Use as cover'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="text-xs text-gray-400 text-center">
              {photos.length === 0
                ? "Photos optional, you can skip this step"
                : `${doneCount} of ${photos.length} uploaded`}
            </p>
          </div>
        )}

        {/* STEP 5: Copy prompt */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 5 of {TOTAL_STEPS}</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Copy this into Claude or ChatGPT</h1>
              <p className="text-gray-500 mt-2 text-base">Tap Copy, switch to Claude.ai or ChatGPT in your phone, paste, send. When you get the response back, paste it on the next screen.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900">
              <p className="text-sm leading-relaxed">
                <strong className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> For the most natural voice:</strong> if you've got a Claude Project trained on your writing, open <em>that</em> project first and paste this prompt there.
              </p>
            </div>

            <button
              type="button"
              onClick={copyPrompt}
              className="w-full btn-primary justify-center h-14 text-base"
            >
              {copied ? (<><Check className="w-5 h-5" /> Copied!</>) : (<><Copy className="w-5 h-5" /> Copy prompt</>)}
            </button>

            <details className="bg-white rounded-2xl border border-gray-100">
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-gray-700">
                Show me the prompt
              </summary>
              <pre className="text-xs text-gray-600 px-5 pb-5 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-72 overflow-y-auto">{builtPrompt}</pre>
            </details>
          </div>
        )}

        {/* STEP 6: Paste response */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 6 of {TOTAL_STEPS}</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Paste the AI's response</h1>
              <p className="text-gray-500 mt-2 text-base">Paste everything from the AI, the bit that starts with <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">---</code> and ends with the post body.</p>
            </div>

            <textarea
              value={aiResponse}
              onChange={e => setAiResponse(e.target.value)}
              rows={16}
              spellCheck={false}
              placeholder={'---\ntitle: "..."\n...'}
              className="w-full text-sm font-mono text-gray-800 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />

            {saveError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {saveError}
              </div>
            )}

            <button
              type="button"
              onClick={saveDraft}
              disabled={saving || !aiResponse.trim()}
              className="w-full btn-primary justify-center h-14 text-base disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
              ) : (
                <>Save as draft <ArrowRight className="w-5 h-5" /></>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              After saving you'll land on the edit screen, review, tweak, then Publish.
            </p>
          </div>
        )}
      </div>

      {/* Sticky bottom nav (steps 1-4 only) */}
      {step < TOTAL_STEPS && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
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
              disabled={!canAdvance()}
              className="btn-primary !py-3 !px-6 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 4 && photos.length === 0 ? 'Skip photos' : 'Next'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
