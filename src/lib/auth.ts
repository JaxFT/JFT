// Per-request auth helper. React's `cache()` deduplicates within a single
// render so the root layout + page + nested server components can all call
// `getCurrentUser()` and only one auth.getUser round-trip hits Supabase.

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
