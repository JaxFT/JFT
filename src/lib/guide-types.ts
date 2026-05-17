// Client-safe shared types for the web-rendered guides. Keep this file
// free of server-only imports so it can be used from both client and
// server components.

export type GuideStatus = 'draft' | 'published'

export type GuideDestination = {
  id: string
  name: string
  body: string        // markdown
  order: number
}

export type GuideThemedSection = {
  id: string
  title: string
  body: string        // markdown
  order: number
}

export type GuideSimpleSection = {
  body: string        // markdown
}

export type GuideSections = {
  why?: GuideSimpleSection
  highlights?: GuideSimpleSection
  needToKnows?: GuideSimpleSection
  destinations?: GuideDestination[]
  themedSections?: GuideThemedSection[]
  finalThoughts?: GuideSimpleSection
  hideAbout?: boolean
}

export type GuideRow = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  country: string | null
  cover_image: string | null
  status: GuideStatus
  is_premium: boolean
  price_pence: number
  tags: string[]
  sections: GuideSections
  preview_destinations: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export function emptySections(): GuideSections {
  return {
    why: { body: '' },
    highlights: { body: '' },
    needToKnows: { body: '' },
    destinations: [],
    themedSections: [],
    finalThoughts: { body: '' },
    hideAbout: false,
  }
}

export function slugifyForGuide(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || `guide-${Date.now()}`
}

// Generate a stable-ish client-side id for destination / themed entries.
// Replaced server-side when the row is saved so we don't trust client values.
export function genLocalId(): string {
  return (
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  )
}
