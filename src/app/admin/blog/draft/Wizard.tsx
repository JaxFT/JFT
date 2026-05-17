'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Camera, Check, Copy, Image as ImageIcon,
  Loader2, ShieldCheck, Star, Trash2, X, ChevronUp, ChevronDown, Sparkles,
} from 'lucide-react'
import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/blog-categories'

type Photo = {
  id: string
  status: 'uploading' | 'done' | 'error'
  url?: string
  caption: string
  isCover: boolean
  error?: string
}

const VIBES = [
  'warm and honest',
  'funny',
  'practical',
  'reflective',
  'family chaos',
  'food-focused',
  'logistical',
]

type LengthKey = 'short' | 'medium' | 'long'

const LENGTHS: Record<LengthKey, { label: string; words: string; readTime: string; structureHint: string }> = {
  short:  { label: 'Short',  words: '250 to 400 words',   readTime: '~1–2 min read', structureHint: 'No sub-headings. Just flowing paragraphs. Stop when the story is told — do not pad.' },
  medium: { label: 'Medium', words: '450 to 700 words',   readTime: '~2–3 min read', structureHint: 'One or two ## sub-headings only if they earn their place. Otherwise paragraphs.' },
  long:   { label: 'Long',   words: '750 to 1100 words',  readTime: '~4–5 min read', structureHint: 'Two to four ## sub-headings, each opening with a clear point. Practical tips list at the end is fine.' },
}

const TOTAL_STEPS = 6

const CATEGORY_LABEL: Record<BlogCategory, string> =
  Object.fromEntries(BLOG_CATEGORIES.map(c => [c.value, c.label])) as Record<BlogCategory, string>

// Suggested CTA phrases the AI can use as the link text when wrapping the
// place link. Choose phrasing that reads naturally inside a sentence; the AI
// picks the one that fits best (or coins something similar).
const LINK_CTA_HINTS: Record<BlogCategory, string> = {
  accommodation: '"book here", "see availability", "check rates", "their website"',
  restaurant:    '"see the menu", "book a table", "find them here", "their website"',
  bar:           '"find them here", "see what they pour", "their website"',
  activity:      '"book tickets", "check opening times", "more on their website", "their website"',
  general:       '"more here", "their website", "see the full details"',
}

export default function Wizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState<BlogCategory | ''>('')
  const [placeName, setPlaceName] = useState('')
  const [placeLink, setPlaceLink] = useState('')
  const [location, setLocation] = useState('')
  const [about, setAbout] = useState('')
  const [detail, setDetail] = useState('')
  const [vibes, setVibes] = useState<string[]>([])
  const [length, setLength] = useState<LengthKey>('medium')
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
        const form = new FormData()
        form.append('file', file)
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

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  const setCaption = (id: string, caption: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p))
  }

  const toggleCover = (id: string) => {
    setPhotos(prev => prev.map(p => ({
      ...p,
      isCover: p.id === id ? !p.isCover : false,
    })))
  }

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
  const lengthConfig = LENGTHS[length]

  const builtPrompt = `You are writing a blog post for JaxFamilyTravels.com. The blog is by Bec (Mama) and Oli (Papa), a UK family travelling full-time with their 8-year-old son Jax. The voice is theirs — warm, specific, observant, honest. Write the post as if Bec or Oli wrote it themselves over a coffee.

WHO WE ARE — get this right:
- Bec = Mama. Oli = Papa. We use Mama and Papa. NEVER "Mum" / "Mom" / "Dad" / "Daddy" / "the kids' mum".
- Jax is 8. He is a curious, articulate, capable kid with real opinions and interests. He is NOT a toddler, NOT a chaos agent, NOT a snack-obsessed prop for parent humour. Do not patronise him.
- We write as "we" (Mama and Papa together) — the voice of a couple recounting a real moment.

HOW WE TALK ABOUT JAX:
- Quote things he actually said only if they are in the notes below. Do not invent quotes.
- Describe what he genuinely did and noticed — those details ARE the post.
- If Jax found something interesting (manhole covers, knots in trees, weird food), that's just interesting. Do NOT frame it as "weirdly" or "of all things" or any other put-down framing. An 8-year-old paying attention to detail is a strength, not a punchline.
- NEVER use the "covered in chocolate / face full of jam / chaos child" trope. We are not writing for parenting magazines. Jax is allowed dignity.
- NEVER use the "our kid does X every five minutes ha ha" parent-joke construction.

VOICE — what good sounds like:
- Specific over generic. "RM 4 for a bowl" beats "very affordable". "Jax counted six geckos on the wall before bed" beats "Jax loved the wildlife".
- Honest about what was disappointing, awkward, overpriced, or just not for us. Praise the good stuff because it earned it, not because it's the polite thing.
- Short, punchy paragraphs. Vary sentence length: three short ones, then one longer, then a fragment. Sometimes.
- Confident about our opinions. We have done this. We are not asking permission.
- Warmth without sentimentality. No life-coach voice. No "this trip taught us…" closers.

THINGS TO NEVER WRITE:
- NO em-dashes (—). Use a comma, a regular hyphen, or a new sentence.
- NO "It's not just X, it's Y" or "X isn't just about Y, it's about Z" constructions.
- NO "weirdly", "of all things", "oddly enough" used to flag an ordinary interest as strange.
- NO anachronisms: no paper maps, no asking strangers for directions in a way that implies no smartphones, no "in the old days", no fax-machine / VHS / 90s references unless directly relevant. We have phones. It is the present.
- NO cliché phrases: nestled, vibrant, bustling, stunning, breathtaking, picturesque, charming, quaint, idyllic, hidden gem, off the beaten path, life-changing, bucket list, must-see, rich tapestry, sprawling.
- NO transitions: delve, ultimately, moreover, furthermore, in essence, that said.
- NO formulaic openers: "Have you ever wondered…", "Picture this…", "There's something about…".
- NO summary endings: "In conclusion", "All in all", "Overall". Just stop, or sign off naturally.
- NO bullet lists unless the post is a genuine list of practical tips at the end.
- NO grand claims. Specific observable detail only.

POST DETAILS:
Type of post: ${category ? CATEGORY_LABEL[category] : 'not specified'}
Location: ${location || 'not specified'}
What this post is about: ${about || 'not specified'}
${placeName.trim()
  ? `Name to feature in the post (mention this by name early in the body): ${placeName.trim()}`
  : 'Name to feature: none — write generally about the location.'}
${placeLink.trim()
  ? `Link for that place: ${placeLink.trim()}
LINK STYLE — IMPORTANT: do NOT show the URL as raw text, and do NOT use the place name as the link text. Instead, embed the URL in a short, natural call-to-action phrase that flows in a sentence. Use markdown link syntax \`[phrase](URL)\`. Pick whichever phrasing reads most naturally${category ? ` (good options for a ${CATEGORY_LABEL[category].toLowerCase()} post: ${LINK_CTA_HINTS[category]})` : ''}. Examples: "We stayed three nights and you can [book here](URL) if you fancy it." / "Worth a stop, [see the menu](URL) before you go." Place this link ONCE, naturally, where it fits in the story.`
  : ''}
What actually happened (raw notes from Bec/Oli): ${detail || 'none'}
Tone/vibe: ${vibes.length ? vibes.join(', ') : 'warm and honest'}

LENGTH — IMPORTANT, do not exceed this:
Target: ${lengthConfig.words} (${lengthConfig.readTime}). ${lengthConfig.structureHint}
If the story does not need the full word count, write less. Padding to hit a number is worse than a tight post.

${coverPhoto
  ? `COVER PHOTO (put this URL in the coverImage frontmatter field; do NOT also place it in the body):
${coverPhoto.url}
Cover caption: ${coverPhoto.caption || '(no caption)'}`
  : 'COVER PHOTO: none selected — leave the coverImage frontmatter field empty.'}

${bodyPhotos.length === 0
  ? 'PHOTOS IN THE BODY: none beyond the cover.'
  : `PHOTOS IN THE BODY — IMPORTANT, you MUST place them IN THE EXACT ORDER LISTED below. Do not reorder. Photo 1 appears before photo 2, which appears before photo 3, etc. Spread them through the body so they don't all sit at the top or bottom. Each photo gets its own line using markdown image syntax: \`![caption](URL)\`.

${bodyPhotos.map((p, i) => `  ${i + 1}. ${p.url}
     Caption: ${p.caption || '(no caption — pick a natural moment that fits where this photo lands)'}`).join('\n')}`}

OUTPUT FORMAT — IMPORTANT: Return the entire blog post WRAPPED IN A SINGLE TRIPLE-BACKTICK CODE BLOCK so I can copy the raw text. Like this:

\`\`\`
---
title: "<compelling, specific title, not generic>"
excerpt: "<one sentence hook for the blog listing, ~25 words>"
date: "${today}"
author: "Jax Family Travels"
coverImage: "${coverPhoto?.url ?? ''}"
tags: ["<3 to 5 short tags, e.g. Country, Region, Theme>"]
---

<Body in markdown at the length specified above. Short punchy paragraphs. No em-dashes. Mama and Papa, never Mum or Dad. Jax has real opinions, not toddler tropes.>
\`\`\`

Do NOT add any text before or after the code block. The code block IS the entire response.`

  const canAdvance = () => {
    if (step === 1) {
      if (!category) return false
      if (placeNameRequired && !placeName.trim()) return false
      return true
    }
    if (step === 2) return location.trim() && about.trim()
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
      const res = await fetch('/api/admin/blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: aiResponse.trim(),
          category: category || null,
          place_name: placeName.trim() || null,
          place_link: placeLink.trim() || null,
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

        {/* STEP 1: What kind of post + place + link */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Step 1 of 6
              </p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">What kind of post is this?</h1>
              <p className="text-gray-500 mt-2 text-base">Pick the type, then name the place (and a link if you've got one). The AI will weave both into the post.</p>
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
              <p className="text-xs text-gray-400 mt-1.5">The AI is told to mention this name in the post.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Website or link (optional)</label>
              <input
                value={placeLink}
                onChange={e => setPlaceLink(e.target.value)}
                placeholder="https://…"
                inputMode="url"
                autoComplete="off"
                className="w-full text-base px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">If you add a link, the first mention of the name will be turned into a clickable link to this URL.</p>
            </div>
          </div>
        )}

        {/* STEP 2: Trip basics */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 2 of 6</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Where, and what's this post about?</h1>
              <p className="text-gray-500 mt-2 text-base">Keep it short — single line is fine.</p>
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
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 3 of 6</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">What actually happened?</h1>
              <p className="text-gray-500 mt-2 text-base">Raw notes are fine. Anything you remember — quotes, prices, what surprised you, what was hard, what Jax said. The AI will turn it into the post.</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">How long should it be?</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(LENGTHS) as LengthKey[]).map(k => {
                  const cfg = LENGTHS[k]
                  const active = length === k
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setLength(k)}
                      className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                        active
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                      }`}
                    >
                      <span className="block font-semibold text-sm">{cfg.label}</span>
                      <span className={`block text-xs mt-0.5 ${active ? 'text-white/80' : 'text-gray-500'}`}>{cfg.readTime}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">{lengthConfig.structureHint}</p>
            </div>
          </div>
        )}

        {/* STEP 4: Photos */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 4 of 6</p>
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
                  Order matters — photos will appear in the post in the order shown below. Use the arrows to rearrange.
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
                          <img src={p.url} alt={p.caption} className="absolute inset-0 w-full h-full object-cover" />
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
                ? "Photos optional — you can skip this step"
                : `${doneCount} of ${photos.length} uploaded`}
            </p>
          </div>
        )}

        {/* STEP 5: Copy prompt */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 5 of 6</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Copy this into Claude or ChatGPT</h1>
              <p className="text-gray-500 mt-2 text-base">Tap Copy, switch to Claude.ai or ChatGPT in your phone, paste, send. When you get the response back, paste it on the next screen.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900">
              <p className="text-sm leading-relaxed">
                <strong className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> For the most natural voice:</strong> if you've got a custom GPT trained on your writing, open <em>that</em> GPT first and paste this prompt there. Pasting into a fresh Claude / ChatGPT session works too, but you'll lose the trained voice.
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

            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4">
              <p className="text-sm text-brand-900 leading-relaxed">
                <strong>Tip:</strong> Open Claude.ai or ChatGPT in another tab/app. Paste the prompt. Wait for the markdown response. Copy ALL of it (starts with <code>---</code>). Come back here and continue.
              </p>
            </div>
          </div>
        )}

        {/* STEP 6: Paste response */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 6 of 6</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Paste the AI's response</h1>
              <p className="text-gray-500 mt-2 text-base">Paste everything from the AI — the bit that starts with <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">---</code> and ends with the post body.</p>
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
              After saving you'll land on the edit screen — review, tweak, then Publish.
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
