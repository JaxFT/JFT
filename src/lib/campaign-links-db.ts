// Short-link campaigns for marketing pushes (e.g. "send this guide's
// link to 60 Instagram DMs") and the funnel events they generate.
// Service-role only, never exposed to anon/authenticated — reads
// happen from the admin page (already gated on isAdminEmail), writes
// happen from the public redirect route and event-logging API route,
// neither of which need RLS since they're server-side and scoped to
// exactly what they're allowed to touch.

import { createClient as createSbClient, type SupabaseClient } from '@supabase/supabase-js'

export type FunnelEventType = 'click' | 'view' | 'buy_click' | 'purchase'

export type CampaignLink = {
  id: string
  code: string
  guideSlug: string
  label: string | null
  active: boolean
  createdAt: string
  // How many times this link was actually sent out (DMs, etc.) — not
  // measurable by us, entered and edited by hand. Null = not entered yet.
  sentCount: number | null
}

export type CampaignStats = CampaignLink & {
  clicks: number
  views: number
  buyClicks: number
  purchases: number
}

function adminClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Looked up on every hit to /l/[code], keep it a single indexed
// SELECT so the redirect stays fast.
export async function resolveCampaignLink(code: string): Promise<{ guideSlug: string } | null> {
  const admin = adminClient()
  const { data } = await admin
    .from('campaign_links')
    .select('guide_slug')
    .eq('code', code)
    .eq('active', true)
    .maybeSingle()
  return data ? { guideSlug: (data as { guide_slug: string }).guide_slug } : null
}

// Fire-and-forget from callers, best-effort — a lost funnel event
// isn't worth failing the request over.
export async function logFunnelEvent(
  campaignCode: string,
  guideSlug: string,
  eventType: FunnelEventType,
): Promise<void> {
  const admin = adminClient()
  const { error } = await admin
    .from('funnel_events')
    .insert({ campaign_code: campaignCode, guide_slug: guideSlug, event_type: eventType })
  if (error) {
    console.error('[funnel_events] insert failed', { campaignCode, eventType, error: error.message })
  }
}

export async function createCampaignLink(input: {
  code: string
  guideSlug: string
  label: string | null
  sentCount: number | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = adminClient()
  const { error } = await admin
    .from('campaign_links')
    .insert({ code: input.code, guide_slug: input.guideSlug, label: input.label, sent_count: input.sentCount })
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'That code is already in use.' }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function setCampaignLinkActive(id: string, active: boolean): Promise<void> {
  const admin = adminClient()
  const { error } = await admin.from('campaign_links').update({ active }).eq('id', id)
  if (error) console.error('[campaign_links] toggle failed', error.message)
}

export async function setCampaignLinkSentCount(id: string, sentCount: number | null): Promise<void> {
  const admin = adminClient()
  const { error } = await admin.from('campaign_links').update({ sent_count: sentCount }).eq('id', id)
  if (error) console.error('[campaign_links] sent_count update failed', error.message)
}

// Every campaign link plus its funnel counts, newest first. Small
// dataset (a handful of campaigns at a time) — fetch links and events
// separately and tally in memory rather than a SQL aggregate, keeps
// this readable and there's no scale concern here.
export async function listCampaignStats(): Promise<CampaignStats[]> {
  const admin = adminClient()
  const [{ data: links }, { data: events }] = await Promise.all([
    admin.from('campaign_links').select('id, code, guide_slug, label, active, created_at, sent_count').order('created_at', { ascending: false }),
    admin.from('funnel_events').select('campaign_code, event_type'),
  ])

  const counts = new Map<string, Record<FunnelEventType, number>>()
  for (const e of (events ?? []) as { campaign_code: string; event_type: FunnelEventType }[]) {
    const row = counts.get(e.campaign_code) ?? { click: 0, view: 0, buy_click: 0, purchase: 0 }
    row[e.event_type] += 1
    counts.set(e.campaign_code, row)
  }

  return ((links ?? []) as { id: string; code: string; guide_slug: string; label: string | null; active: boolean; created_at: string; sent_count: number | null }[])
    .map(l => {
      const c = counts.get(l.code) ?? { click: 0, view: 0, buy_click: 0, purchase: 0 }
      return {
        id: l.id,
        code: l.code,
        guideSlug: l.guide_slug,
        label: l.label,
        active: l.active,
        createdAt: l.created_at,
        sentCount: l.sent_count,
        clicks: c.click,
        views: c.view,
        buyClicks: c.buy_click,
        purchases: c.purchase,
      }
    })
}
