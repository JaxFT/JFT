import { NextResponse, after } from 'next/server'
import { resolveCampaignLink, logFunnelEvent } from '@/lib/campaign-links-db'
import { isLinkPreviewBot } from '@/lib/link-preview-bots'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REF_COOKIE = 'jft_ref'
const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, covers a browse-now buy-later visitor

// jaxfamilytravels.com/l/[code] — campaign short link. Looks up the
// destination guide, logs a click (skipped for known link-preview
// bots so an Instagram/WhatsApp unfurl doesn't count as a visitor),
// tags the visitor with a cookie so later funnel steps (buy click,
// purchase) can still attribute back to this campaign even without
// the ?ref= query string still being in the URL, then redirects.
//
// The click log is fired via after() so it never adds latency to the
// redirect itself — the response goes out immediately.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

  const link = await resolveCampaignLink(code)
  if (!link) {
    return NextResponse.redirect(`${siteUrl}/guides`, { status: 302 })
  }

  const destination = `${siteUrl}/guides/${link.guideSlug}?ref=${encodeURIComponent(code)}`
  const response = NextResponse.redirect(destination, { status: 302 })

  const ua = request.headers.get('user-agent')
  if (!isLinkPreviewBot(ua)) {
    response.cookies.set(REF_COOKIE, code, {
      maxAge: REF_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    })
    after(async () => {
      await logFunnelEvent(code, link.guideSlug, 'click')
    })
  }

  return response
}
