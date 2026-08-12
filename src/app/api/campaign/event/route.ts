import { NextResponse, after } from 'next/server'
import { logFunnelEvent } from '@/lib/campaign-links-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Public fire-and-forget. Logs a 'view' or 'buy_click' funnel event
// for a campaign, called from GuideViewTracker and the guide Buy
// buttons. No-ops (still 200s) when there's no ref — most traffic
// isn't campaign-tagged and shouldn't write a row at all, this only
// exists to attribute the tagged visitors who came via /l/[code].
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { eventType?: string; guideSlug?: string; ref?: string }
  const { eventType, guideSlug, ref } = body

  if (eventType !== 'view' && eventType !== 'buy_click') {
    return NextResponse.json({ error: 'Unknown eventType' }, { status: 400 })
  }
  if (!guideSlug || typeof guideSlug !== 'string') {
    return NextResponse.json({ error: 'Missing guideSlug' }, { status: 400 })
  }
  if (!ref || typeof ref !== 'string') {
    return NextResponse.json({ ok: true, skipped: 'no ref' })
  }

  after(async () => {
    await logFunnelEvent(ref, guideSlug, eventType)
  })
  return NextResponse.json({ ok: true })
}
