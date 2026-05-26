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
// Rows older than this get swept on read so the table doesn't grow
// indefinitely. 31 days lets us answer "last 30 days" counts with one
// day of buffer; older rows are gone.
const SWEEP_WINDOW_SECONDS = 31 * 24 * 60 * 60

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

export type VisitorCounts = {
  active: number   // tabs heartbeating in the last 60s
  last24h: number  // distinct sessions seen in the last 24h
  last7d: number   // distinct sessions seen in the last 7 days
  last30d: number  // distinct sessions seen in the last 30 days
}

// One query per window. Each session is a row keyed by session_id
// (localStorage UUID), so "distinct sessions" is just "rows where
// last_seen >= cutoff" — no DISTINCT needed.
export async function getVisitorCounts(): Promise<VisitorCounts> {
  const sb = admin()
  const sweepCutoff = new Date(Date.now() - SWEEP_WINDOW_SECONDS * 1000).toISOString()
  // Sweep is best-effort — failures here don't break the counts.
  await sb.from('live_sessions').delete().lt('last_seen', sweepCutoff)

  const now = Date.now()
  const cutoff = (secs: number) => new Date(now - secs * 1000).toISOString()
  const [active, last24h, last7d, last30d] = await Promise.all([
    sb.from('live_sessions').select('session_id', { count: 'exact', head: true }).gte('last_seen', cutoff(ACTIVE_WINDOW_SECONDS)),
    sb.from('live_sessions').select('session_id', { count: 'exact', head: true }).gte('last_seen', cutoff(24 * 60 * 60)),
    sb.from('live_sessions').select('session_id', { count: 'exact', head: true }).gte('last_seen', cutoff(7 * 24 * 60 * 60)),
    sb.from('live_sessions').select('session_id', { count: 'exact', head: true }).gte('last_seen', cutoff(30 * 24 * 60 * 60)),
  ])
  if (active.error)  throw new Error(active.error.message)
  if (last24h.error) throw new Error(last24h.error.message)
  if (last7d.error)  throw new Error(last7d.error.message)
  if (last30d.error) throw new Error(last30d.error.message)
  return {
    active: active.count ?? 0,
    last24h: last24h.count ?? 0,
    last7d: last7d.count ?? 0,
    last30d: last30d.count ?? 0,
  }
}

// Kept for the admin live-count endpoint, which still wants just the
// active number alongside the user-tier counts. Reuses getVisitorCounts
// under the hood so the sweep happens once per read.
export async function getLiveSessionCount(): Promise<number> {
  const { active } = await getVisitorCounts()
  return active
}
