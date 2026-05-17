// Server-only part of the auto-link system. Lives in its own file so
// client components (GuideMarkdown, EditablePreview) can keep importing
// the type + remark plugin from blog-links.ts without dragging in
// next/headers via the supabase server client.

import { createClient } from '@/lib/supabase/server'
import type { AutoLinkPhrase } from '@/lib/blog-links'

// Build the phrase -> URL map used to auto-link recurring terms inside
// rendered blog post bodies. Curated overrides win over tag-derived links.
export async function getAutoLinkPhrases(): Promise<AutoLinkPhrase[]> {
  const supabase = await createClient()

  const [{ data: curatedRows }, { data: postRows }] = await Promise.all([
    supabase.from('blog_auto_links').select('phrase, url'),
    supabase.from('blog_posts').select('tags').eq('status', 'published'),
  ])

  const curatedLower = new Set<string>()
  const phrases: AutoLinkPhrase[] = []

  for (const row of curatedRows ?? []) {
    const phrase = String((row as { phrase: string }).phrase ?? '').trim()
    const url = String((row as { url: string }).url ?? '').trim()
    if (!phrase || !url) continue
    if (curatedLower.has(phrase.toLowerCase())) continue
    curatedLower.add(phrase.toLowerCase())
    phrases.push({ phrase, url })
  }

  const tagSet = new Set<string>()
  for (const row of postRows ?? []) {
    const tags = (row as { tags: string[] | null }).tags ?? []
    for (const t of tags) {
      const trimmed = String(t).trim()
      if (trimmed) tagSet.add(trimmed)
    }
  }
  for (const tag of tagSet) {
    if (curatedLower.has(tag.toLowerCase())) continue
    phrases.push({ phrase: tag, url: `/blog?tag=${encodeURIComponent(tag)}` })
  }

  return phrases
}
