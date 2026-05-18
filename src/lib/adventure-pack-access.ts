// Server-side access check for an Adventure Pack page. Decides whether
// the requesting user can view the full pack or should be sent to the
// upgrade / login flow.
//
// Rules:
//   - Not signed in     → must log in
//   - France            → always accessible to any signed-in user
//   - Premium subscriber → can access any pack
//   - One-off purchaser → can access just the purchased pack
//   - Otherwise         → locked (show upgrade CTA on the listing)

import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'

export type PackAccess =
  | { kind: 'allow'; reason: 'free' | 'premium' | 'purchased' }
  | { kind: 'login' }
  | { kind: 'locked'; isPremium: boolean }

export async function checkAdventurePackAccess(slug: string): Promise<PackAccess> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { kind: 'login' }

  if (slug === 'france') return { kind: 'allow', reason: 'free' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()
  if (isPremiumTier(profile?.subscription_tier)) {
    return { kind: 'allow', reason: 'premium' }
  }

  const { data: purchase } = await supabase
    .from('jax_pack_purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('country_slug', slug)
    .maybeSingle()
  if (purchase) return { kind: 'allow', reason: 'purchased' }

  return { kind: 'locked', isPremium: false }
}
