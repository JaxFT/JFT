// Structured tagging for blog posts. Three axes:
//   - travel_stages: what stage is the reader at? (1-2 per post)
//   - destination_country: which country pack does this map to? (0-1 per post)
//   - topics: subject buckets, drives the /blog Topic filter (0-3 per post)
//
// Free-form `tags` are kept alongside these and used for "more like this" /
// SEO connections — they don't drive the filter UI any more.
//
// Lives separately from blog-db.ts because blog-db.ts pulls in server-only
// Supabase helpers via next/headers, which can't be imported into client
// components like the wizard.

import type { LucideIcon } from 'lucide-react'
import {
  Sparkles, Compass, Plane, Home, GraduationCap,
  PoundSterling, Utensils, BedDouble, Train, Shield,
  Backpack, MapPin, Heart, Users,
} from 'lucide-react'

// ── TRAVEL STAGE ─────────────────────────────────────────────────────────
export type TravelStage =
  | 'dreaming'
  | 'planning'
  | 'on-the-road'
  | 'long-term'
  | 'worldschooling'

export const TRAVEL_STAGES: { value: TravelStage; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'dreaming',       label: 'Dreaming',       description: 'You\'re thinking about doing this one day.',                       icon: Sparkles },
  { value: 'planning',       label: 'Planning',       description: 'You\'ve decided — now you\'re working out the how.',               icon: Compass },
  { value: 'on-the-road',    label: 'On the road',    description: 'Currently travelling. Short or long.',                             icon: Plane },
  { value: 'long-term',      label: 'Long-term life', description: 'Living the travelling life as a routine, months or years in.',     icon: Home },
  { value: 'worldschooling', label: 'Worldschooling', description: 'Educating your kids through travel itself, not despite it.',       icon: GraduationCap },
]

export const VALID_TRAVEL_STAGES: TravelStage[] = TRAVEL_STAGES.map(s => s.value)

export const TRAVEL_STAGE_LABEL: Record<TravelStage, string> =
  Object.fromEntries(TRAVEL_STAGES.map(s => [s.value, s.label])) as Record<TravelStage, string>

// A post should carry 1–2 stages.
export const MAX_TRAVEL_STAGES_PER_POST = 2

// ── TOPIC BUCKETS ────────────────────────────────────────────────────────
export type BlogTopic =
  | 'money'
  | 'food'
  | 'accommodation'
  | 'transport'
  | 'schooling'
  | 'safety'
  | 'packing'
  | 'activities'
  | 'long-term-life'
  | 'family-dynamics'

export const BLOG_TOPICS: { value: BlogTopic; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'money',           label: 'Money & budget',     description: 'What it cost, how to budget, what to skip.',          icon: PoundSterling },
  { value: 'food',            label: 'Food & restaurants', description: 'Where to eat, what to try, real meal stories.',       icon: Utensils },
  { value: 'accommodation',   label: 'Accommodation',      description: 'Hotels, Airbnbs, hostels, house-sits, camp-grounds.', icon: BedDouble },
  { value: 'transport',       label: 'Transport',          description: 'Flights, trains, road trips, visas, getting around.', icon: Train },
  { value: 'schooling',       label: 'Schooling & learning', description: 'How kids keep learning on the road.',               icon: GraduationCap },
  { value: 'safety',          label: 'Health & safety',    description: 'Insurance, illness, vaccines, what to look out for.', icon: Shield },
  { value: 'packing',         label: 'Packing & gear',     description: 'What we packed, what we wish we hadn\'t.',            icon: Backpack },
  { value: 'activities',      label: 'Activities & sights', description: 'Things to do, places to visit, can\'t-miss spots.',   icon: MapPin },
  { value: 'long-term-life',  label: 'Long-term life',     description: 'Routines, rhythms, working on the road, slowing down.', icon: Home },
  { value: 'family-dynamics', label: 'Family dynamics',    description: 'Sibling stuff, partner stuff, missing home.',         icon: Heart },
]

export const VALID_BLOG_TOPICS: BlogTopic[] = BLOG_TOPICS.map(t => t.value)

export const BLOG_TOPIC_LABEL: Record<BlogTopic, string> =
  Object.fromEntries(BLOG_TOPICS.map(t => [t.value, t.label])) as Record<BlogTopic, string>

// A post can pick up to 3 topics; the wizard soft-enforces this.
export const MAX_TOPICS_PER_POST = 3

// ── HELPERS ──────────────────────────────────────────────────────────────
export function sanitizeTravelStages(input: unknown): TravelStage[] {
  if (!Array.isArray(input)) return []
  const out: TravelStage[] = []
  for (const v of input) {
    if (typeof v === 'string' && VALID_TRAVEL_STAGES.includes(v as TravelStage) && !out.includes(v as TravelStage)) {
      out.push(v as TravelStage)
    }
  }
  return out.slice(0, MAX_TRAVEL_STAGES_PER_POST)
}

export function sanitizeBlogTopics(input: unknown): BlogTopic[] {
  if (!Array.isArray(input)) return []
  const out: BlogTopic[] = []
  for (const v of input) {
    if (typeof v === 'string' && VALID_BLOG_TOPICS.includes(v as BlogTopic) && !out.includes(v as BlogTopic)) {
      out.push(v as BlogTopic)
    }
  }
  return out.slice(0, MAX_TOPICS_PER_POST)
}

// Use the existing PACK_META slugs as the destination list. A destination
// can also be null ("not tied to a specific country"), which is the case
// for general posts like "how we packed for a year".
export function sanitizeDestinationCountry(input: unknown, validSlugs: string[]): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  return validSlugs.includes(trimmed) ? trimmed : null
}

// Used to flag the "Show only general / no specific destination" option in
// dropdowns. Real destination slugs come from PACK_META.
export const DESTINATION_NONE_VALUE = '__none'
