// Shared types + server queries for the 1:1 call request feature.
// Used by the admin list, the account thread, and the messages API.

import { createClient as createSbClient } from '@supabase/supabase-js'

export type CallRequestStatus = 'new' | 'replied' | 'scheduled' | 'completed' | 'declined'

export type CallRequestRow = {
  id: string
  user_id: string | null
  name: string
  email: string
  family_situation: string | null
  where_now: string | null
  journey_stage: 'dreaming' | 'planning' | 'soon' | 'already' | null
  what_to_discuss: string
  timezone: string | null
  preferred_days: string[]
  preferred_times: string[]
  status: CallRequestStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type CallRequestMessageRow = {
  id: string
  call_request_id: string
  sender: 'admin' | 'user'
  body: string
  created_at: string
}

// Single source of truth for the labels each admin and account-side
// rendering uses for day / time bucket values.
export const DAY_LABEL: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}
export const TIME_LABEL: Record<string, string> = {
  morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
}

// Service-role client. Used by admin routes that have already verified
// the caller is an admin via the email allowlist; bypasses RLS so we
// don't have to grant cookie-auth admin policies on every read path.
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
