// Client-safe shared types for the web-rendered guides. Keep this file
// free of server-only imports so it can be used from both client and
// server components.

export type GuideStatus = 'draft' | 'published'

// One ordered content block inside a guide. The wizard lets the admin
// add as many of these as they want, in any order, with editable headings.
// `kind` only affects (a) which AI prompt template the wizard suggests
// and (b) the default value of `freePreview` for new blocks.
export type GuideBlockKind = 'intro' | 'destination' | 'themed' | 'list' | 'closing'

export type GuideContentBlock = {
  id: string
  kind: GuideBlockKind
  heading: string       // user-controlled, no longer hardcoded
  body: string          // markdown
  freePreview: boolean  // visible to non-buyers
  order: number
}

// Sections JSONB shape. New guides only use `blocks` + `hideAbout`.
// The legacy fields stay typed because old rows in Supabase still have
// them — `normaliseRow` migrates them into `blocks` on read.
export type GuideSimpleSection = { body: string }
export type GuideDestination   = { id: string; name: string; body: string; order: number }
export type GuideThemedSection = { id: string; title: string; body: string; order: number }

export type GuideSections = {
  blocks?: GuideContentBlock[]
  hideAbout?: boolean

  // Legacy — kept for read-side back-compat. Never written by the new wizard.
  why?: GuideSimpleSection
  highlights?: GuideSimpleSection
  needToKnows?: GuideSimpleSection
  destinations?: GuideDestination[]
  themedSections?: GuideThemedSection[]
  finalThoughts?: GuideSimpleSection
}

export type GuideRow = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  country: string | null    // now optional "scope" — may be empty for world-schooling / global guides
  cover_image: string | null
  status: GuideStatus
  is_premium: boolean
  price_pence: number
  tags: string[]
  // NEW model — the whole guide as one markdown doc. When non-empty,
  // takes precedence over `sections.blocks`.
  body_markdown: string
  preview_percent: number   // 0-100, how much of body_markdown shows to non-buyers
  sections: GuideSections   // legacy blocks model; used when body_markdown is empty
  preview_destinations: number   // legacy; new model uses per-block freePreview
  published_at: string | null
  created_at: string
  updated_at: string
}

// Truncate a markdown doc to roughly `percent` of its character length,
// snapping forward to the next paragraph break so we don't cut a
// sentence mid-flow. Same approach as the blog truncation.
export function truncateMarkdownToPercent(md: string, percent: number): string {
  if (!md) return md
  const target = Math.max(80, Math.floor((md.length * percent) / 100))
  if (md.length <= target) return md
  const after = md.indexOf('\n\n', target)
  return after === -1 ? md.slice(0, target) : md.slice(0, after)
}

// Pull an ordered list of (level-2) headings out of a markdown doc so
// we can render a TOC. Skips code fences so a "## something" inside a
// ``` block isn't picked up. Each entry gets an anchor-friendly id.
export type GuideTocEntry = { id: string; label: string }

function anchorise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

export function extractMarkdownToc(md: string): GuideTocEntry[] {
  if (!md) return []
  const lines = md.split('\n')
  const out: GuideTocEntry[] = []
  const seen = new Set<string>()
  let inFence = false
  for (const line of lines) {
    if (/^```/.test(line)) { inFence = !inFence; continue }
    if (inFence) continue
    const m = line.match(/^##\s+(.+?)\s*$/)
    if (!m) continue
    const label = m[1].trim()
    let id = anchorise(label) || 'section'
    // dedupe anchors
    let n = 2
    while (seen.has(id)) { id = `${anchorise(label)}-${n++}` }
    seen.add(id)
    out.push({ id, label })
  }
  return out
}

export function emptySections(): GuideSections {
  return { blocks: [], hideAbout: false }
}

export function slugifyForGuide(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || `guide-${Date.now()}`
}

// Generate a stable-ish client-side id for blocks. Replaced server-side
// when the row is saved so we don't trust client values.
export function genLocalId(): string {
  return (
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  )
}

// Default heading suggestions per kind — used when a new block is added.
// Scope is the country / theme name from the basics step, or null.
export function defaultHeadingFor(kind: GuideBlockKind, scope: string | null): string {
  const where = scope?.trim() || 'this'
  switch (kind) {
    case 'intro':       return `Why ${where}`
    case 'destination': return 'New destination'
    case 'themed':      return 'New section'
    case 'list':        return `Things to do in ${where}`
    case 'closing':     return 'Final thoughts'
  }
}

export function defaultFreePreviewFor(kind: GuideBlockKind): boolean {
  return kind === 'intro'
}
