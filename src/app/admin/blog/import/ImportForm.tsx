'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Check, ShieldCheck, ArrowRight } from 'lucide-react'

const PROMPT_TEMPLATE = `You are writing a blog post for JaxFamilyTravels.com. The blog is written by Bec and Oli, a UK couple who left England with their 8-year-old son Jax to travel long-term. They document their real family life, honest, warm, funny, and specific. Never generic. Never life-coach-y or preachy.

VOICE RULES:
- Write as "we" (Bec and Oli speaking together), natural, warm, occasionally funny
- Jax is named throughout, specific things he said or did
- Professional but genuinely friendly, like a smart, funny friend who travels, not a brand
- Honest: include what was hard or unexpected, not just the highlights
- No clichés like "hidden gem", "off the beaten path", "life-changing", "bucket list"
- Short punchy paragraphs. Real sentences. No waffle.

POST DETAILS:
Location: <where the post is about>
What this post is about: <one-line summary>
What actually happened (raw notes): <your raw notes>
Tone/vibe: warm and honest
Additional details to include: <anything else>

OUTPUT FORMAT, Return a markdown blog post file with YAML frontmatter. Exact structure:

---
title: "<compelling, specific title, not generic>"
excerpt: "<one-sentence hook for the blog listing, ~25 words>"
date: "${new Date().toISOString().slice(0, 10)}"
author: "Jax Family Travels"
coverImage: ""
tags: ["<3 to 5 short tags>"]
---

<Body in markdown, 800–1200 words. Use ## for section headings, **bold** for emphasis. Short punchy paragraphs.

End with a warm, natural sign-off in Bec & Oli's voice.>

Return ONLY the markdown file. No preamble, no \`\`\` code fences. Start with the opening --- of the frontmatter.`

export default function ImportForm() {
  const router = useRouter()
  const [markdown, setMarkdown] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(PROMPT_TEMPLATE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/admin/blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: markdown.trim() || undefined, title: markdown.trim() ? undefined : 'Untitled draft' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      router.push(`/admin/blog/${data.id}/edit?new=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6 text-xs font-bold tracking-widest uppercase">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <Link href="/admin" className="text-brand-600 hover:underline">Admin</Link>
          <span className="text-gray-400">/</span>
          <Link href="/admin/blog" className="text-brand-600 hover:underline">Blog posts</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">Import</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paste a blog post</h1>
        <p className="text-gray-500 mb-10 max-w-xl">
          For when you've written or generated a post elsewhere (Claude.ai, ChatGPT, by hand, anywhere) and just want to get it into the site.
        </p>

        {/* Prompt template */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="font-bold text-gray-900 mb-1">Step 1 (optional), copy this prompt</h2>
              <p className="text-sm text-gray-500">If you're using Claude.ai or ChatGPT, paste this prompt in, fill in the &lt;angle bracket&gt; parts, and it'll give you back markdown you can paste below.</p>
            </div>
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-md shrink-0"
            >
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy prompt</>}
            </button>
          </div>
          <pre className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-72">{PROMPT_TEMPLATE}</pre>
        </div>

        {/* Paste form */}
        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-1">Step 2, paste the markdown</h2>
          <p className="text-sm text-gray-500 mb-4">
            Paste the full output from Claude (or your own markdown). Should start with <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">---</code> for frontmatter. Or leave it blank to create an empty draft.
          </p>

          <textarea
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            rows={20}
            spellCheck={false}
            className="w-full text-sm font-mono text-gray-800 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y leading-relaxed"
            placeholder={'---\ntitle: "Your post title"\nexcerpt: "..."\ndate: "' + new Date().toISOString().slice(0,10) + '"\ntags: ["..."]\n---\n\nPost body in markdown...'}
          />

          {error && (
            <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-5">
            <Link href="/admin/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn-primary !py-2 !px-5 !text-sm">
              {saving ? 'Saving…' : (<>Create draft <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
