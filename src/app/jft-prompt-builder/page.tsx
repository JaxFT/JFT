import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { EMPTY_PROFILE, type FamilyProfile } from '@/lib/jft-prompts'
import PromptBuilder from './PromptBuilder'

export const metadata: Metadata = {
  title: 'AI Travel Prompt Builder',
  // Keep it out of search while it's admin-only and a work in progress.
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function JftPromptBuilderPage() {
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
      .select('adults, kids_ages, home_airport, travel_style')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) {
      initialProfile = {
        adults: data.adults ?? null,
        kidsAges: (data.kids_ages ?? []) as number[],
        homeAirport: data.home_airport ?? null,
        travelStyle: data.travel_style ?? null,
      }
    }
  }

  return (
    <PromptBuilder
      isLoggedIn={!!user}
      initialProfile={initialProfile}
    />
  )
}
