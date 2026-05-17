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
  sections: GuideSections   // post-migration: `blocks` is always populated
  preview_destinations: number   // legacy; new model uses per-block freePreview
  published_at: string | null
  created_at: string
  updated_at: string
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
