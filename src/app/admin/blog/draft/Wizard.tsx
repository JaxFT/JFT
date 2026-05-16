'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Camera, Check, Copy, Image as ImageIcon,
  Loader2, ShieldCheck, Trash2, X,
} from 'lucide-react'

type Photo = {
  id: string
  status: 'uploading' | 'done' | 'error'
  url?: string
  caption: string
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

const TOTAL_STEPS = 5

export default function Wizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [location, setLocation] = useState('')
  const [about, setAbout] = useState('')
  const [detail, setDetail] = useState('')
  const [vibes, setVibes] = useState<string[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [aiResponse, setAiResponse] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleVibe = (v: string) => {
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const newPhotos: Photo[] = Array.from(files).map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      status: 'uploading',
      caption: '',
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

  const allPhotosReady = photos.every(p => p.status !== 'uploading')
  const doneCount = photos.filter(p => p.status === 'done').length

  const today = new Date().toISOString().slice(0, 10)

  const builtPrompt = `You are writing a blog post for JaxFamilyTravels.com. The blog is written by Bec and Oli, a UK couple who left England with their 8-year-old son Jax to travel long-term. They document their real family life — honest, warm, funny, and specific. Never generic. Never life-coach-y or preachy.

VOICE RULES:
- Write as "we" (Bec and Oli speaking together) — natural, warm, occasionally funny
- Jax is named throughout — specific things he said or did
- Professional but genuinely friendly — like a smart, funny friend who travels, not a brand
- Honest: include what was hard or unexpected, not just the highlights
- No clichés like "hidden gem", "off the beaten path", "life-changing", "bucket list"
- Short punchy paragraphs. Real sentences. No waffle.

POST DETAILS:
Location: ${location || 'not specified'}
What this post is about: ${about || 'not specified'}
What actually happened (raw notes): ${detail || 'none'}
Tone/vibe: ${vibes.length ? vibes.join(', ') : 'warm and honest'}

PHOTOS TO PLACE (use these exact URLs in the markdown):
${photos.filter(p => p.status === 'done').length === 0
  ? 'No photos this post.'
  : photos
      .filter(p => p.status === 'done')
      .map((p, i) => `Photo ${i + 1}: ${p.url}\n  Caption: ${p.caption || '(no caption — pick one from the body)'}`)
      .join('\n')}

OUTPUT FORMAT — Return a markdown blog post file with YAML frontmatter. Exact structure:

---
title: "<compelling, specific title — not generic>"
excerpt: "<one-sentence hook for the blog listing, ~25 words>"
date: "${today}"
author: "Jax Family Travels"
coverImage: ""
tags: ["<3 to 5 short tags, e.g. Country, Region, Theme>"]
---

<Body in markdown, 800–1200 words. Use ## for section headings, **bold** for emphasis. Short punchy paragraphs.

Place each photo above using ![caption text](URL from the list above) at a natural moment in the post.

End with a warm, natural sign-off in Bec & Oli's voice.>

Return ONLY the markdown file. No preamble, no \`\`\` code fences. Start with the opening --- of the frontmatter.`

  const canAdvance = () => {
    if (step === 1) return location.trim() && about.trim()
    if (step === 2) return detail.trim()
    if (step === 3) return allPhotosReady
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
        body: JSON.stringify({ markdown: aiResponse.trim() }),
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

        {/* STEP 1: Trip basics */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Step 1 of 5
              </p>
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

        {/* STEP 2: The story */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 2 of 5</p>
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
          </div>
        )}

        {/* STEP 3: Photos */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 3 of 5</p>
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
              <div className="space-y-4">
                {photos.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                        aria-label="Remove photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3">
                      <input
                        value={p.caption}
                        onChange={e => setCaption(p.id, e.target.value)}
                        placeholder="Caption (one short sentence)"
                        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              {photos.length === 0
                ? "Photos optional — you can skip this step"
                : `${doneCount} of ${photos.length} uploaded`}
            </p>
          </div>
        )}

        {/* STEP 4: Copy prompt */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 4 of 5</p>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Copy this into Claude or ChatGPT</h1>
              <p className="text-gray-500 mt-2 text-base">Tap Copy, switch to Claude.ai or ChatGPT in your phone, paste, send. When you get the response back, paste it on the next screen.</p>
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

        {/* STEP 5: Paste response */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Step 5 of 5</p>
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
              {step === 3 && photos.length === 0 ? 'Skip photos' : 'Next'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
