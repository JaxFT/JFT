import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { EMPTY_PROFILE, type FamilyProfile, type RelatedContentItem } from '@/lib/jft-prompts'
import { listPublishedWebGuides } from '@/lib/guides-content-db'
import { listPublishedPosts } from '@/lib/blog-db'
import { getPackByIso2, getPackMeta } from '@/lib/adventurePackMeta'
import PromptBuilder from './PromptBuilder'

export const metadata: Metadata = {
  title: 'AI Travel Prompt Builder',
  // Keep it out of search while it's admin-only and a work in progress.
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AiTravelPromptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── TEMPORARY ADMIN GATE ──────────────────────────────────────────
  // While we build this in the dark, the page does not exist for anyone
  // but admins. To launch publicly, delete this block (and flip the
  // metadata robots above). The page is already built to work with no
  // login, so nothing else changes at launch.
  if (!isAdminEmail(user?.email)) {
    notFound()
  }
  // ──────────────────────────────────────────────────────────────────

  // Load the viewer's saved family profile so the builder pre-fills.
  let initialProfile: FamilyProfile = EMPTY_PROFILE
  if (user) {
    const { data } = await supabase
      .from('family_profiles')
      .select('adults, kids_ages, home_country, home_airport, home_currency, travel_style')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) {
      initialProfile = {
        adults: data.adults ?? null,
        kidsAges: (data.kids_ages ?? []) as number[],
        homeCountry: data.home_country ?? null,
        homeAirport: data.home_airport ?? null,
        homeCurrency: data.home_currency ?? null,
        travelStyle: (data.travel_style ?? []) as string[],
      }
    }
  }

  // Build the related-content catalogue from published guides + posts.
  // The client matches it against the destination the user types.
  const [guides, posts] = await Promise.all([
    listPublishedWebGuides(),
    listPublishedPosts(),
  ])
  const related: RelatedContentItem[] = []
  for (const g of guides) {
    const terms = [g.title.toLowerCase()]
    if (g.country) terms.push(g.country.toLowerCase())
    related.push({ type: 'guide', title: g.title, href: `/guides/${g.slug}`, terms })
  }
  for (const b of posts) {
    const terms = [b.title.toLowerCase()]
    const dc = b.destination_country
    if (dc) {
      terms.push(dc.toLowerCase())
      // destination_country can be a pack slug or ISO2, resolve to a
      // proper country name so "Sri Lanka" matches "lk"/"sri-lanka".
      const meta = getPackMeta(dc) ?? getPackByIso2(dc)
      if (meta?.country) terms.push(meta.country.toLowerCase())
    }
    related.push({ type: 'blog', title: b.title, href: `/blog/${b.slug}`, terms })
  }

  return (
    <PromptBuilder
      isLoggedIn={!!user}
      initialProfile={initialProfile}
      related={related}
    />
  )
}
