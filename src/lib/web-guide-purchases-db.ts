// Server-side helpers for the web-guide download purchase ledger.
// Separate from src/lib/guides-db.ts (legacy PDF guide purchases live
// in `purchases`) to keep the two stores from contaminating each other.

import { createClient } from '@/lib/supabase/server'

export async function userHasPurchasedWebGuide(
  userId: string,
  guideId: string,
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('web_guide_purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('guide_id', guideId)
    .maybeSingle()
  return !!data
}
