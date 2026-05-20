// GET /api/web-guides/[slug]/download
// Streams a self-contained HTML file of the guide to the buyer.
//
// Two ways to authorise the download:
//   • ?session_id=cs_… — fresh from Stripe Checkout. Verified
//     against Stripe; no sign-in required. This is the path a
//     guest buyer takes immediately after paying.
//   • Logged-in user with a row in web_guide_purchases — for
//     repeat downloads by someone who already has an account.
//
// Premium does NOT grant download access per current policy
// (premium = web reading only).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe'
import { getPublishedWebGuideBySlug } from '@/lib/guides-content-db'
import { userHasPurchasedWebGuide } from '@/lib/web-guide-purchases-db'
import { claimWebGuidePurchase } from '@/lib/claim-web-guide-purchase'
import { renderGuideHtml, downloadFilenameFor } from '@/lib/web-guide-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')

  const guide = await getPublishedWebGuideBySlug(slug)
  if (!guide) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  // Buyer's email is the watermark on the rendered file. We resolve
  // it via whichever auth path was used.
  let buyerEmail: string | null = null

  if (sessionId) {
    // Post-purchase guest download path. Verify the session against
    // Stripe directly so an unpaid/stolen/old session_id can't grab
    // the file. Also confirm it was for THIS guide.
    let session
    try {
      session = await stripeClient().checkout.sessions.retrieve(sessionId)
    } catch {
      return NextResponse.json({ error: 'Invalid checkout session' }, { status: 400 })
    }
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
    }
    if (session.metadata?.guide_id !== guide.id) {
      return NextResponse.json({ error: 'Session is for a different guide' }, { status: 403 })
    }
    // Best-effort claim so the purchase row exists (and the user
    // account if the webhook hasn't fired yet). Doesn't block the
    // download — the Stripe verification above is the gate.
    const claim = await claimWebGuidePurchase({ session })
    buyerEmail = (claim.ok && claim.email)
      ? claim.email
      : session.customer_details?.email ?? session.customer_email ?? null
  } else {
    // Authenticated path. Used by signed-in returners and any future
    // "my downloads" page.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    const purchased = await userHasPurchasedWebGuide(user.id, guide.id)
    if (!purchased) {
      return NextResponse.json({ error: 'You have not purchased this guide.' }, { status: 403 })
    }
    buyerEmail = user.email ?? null
  }

  const html = await renderGuideHtml(guide, buyerEmail)
  const filename = downloadFilenameFor(guide)

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
