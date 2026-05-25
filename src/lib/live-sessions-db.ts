// Server-only helpers for the live-traffic counter. The heartbeat
// table has no public RLS policies, so writes and reads here use the
// service role and never the browser-side anon key.

import { createClient as createSbClient } from '@supabase/supabase-js'

function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// How long a session stays "active" without a fresh heartbeat. The
// client pings every 30s, so 60s gives one missed-ping buffer.
const ACTIVE_WINDOW_SECONDS = 60
// Rows older than this get swept on read so the table doesn't grow.
const SWEEP_WINDOW_SECONDS = 5 * 60

export async function recordHeartbeat(sessionId: string, pathname: string): Promise<void> {
  const sb = admin()
  const { error } = await sb
    .from('live_sessions')
    .upsert(
      { session_id: sessionId, pathname, last_seen: new Date().toISOString() },
      { onConflict: 'session_id' },
    )
  if (error) throw new Error(error.message)
}

// Count of sessions seen in the last ACTIVE_WINDOW_SECONDS, plus a
// best-effort sweep of stale rows. The sweep runs every read which is
// cheap at this scale; if the table grows beyond a few hundred rows
// at any moment, switch to pg_cron.
export async function getLiveSessionCount(): Promise<number> {
  const sb = admin()
  const sweepCutoff = new Date(Date.now() - SWEEP_WINDOW_SECONDS * 1000).toISOString()
  // Sweep failures are non-fatal — the table just stays a bit bigger
  // until the next read. We still throw if the active-count query
  // itself errors so the admin card shows "Count unavailable" instead
  // of pretending the site is empty (the original bug).
  await sb.from('live_sessions').delete().lt('last_seen', sweepCutoff)

  const activeCutoff = new Date(Date.now() - ACTIVE_WINDOW_SECONDS * 1000).toISOString()
  const { count, error } = await sb
    .from('live_sessions')
    .select('session_id', { count: 'exact', head: true })
    .gte('last_seen', activeCutoff)
  if (error) throw new Error(error.message)
  return count ?? 0
}
