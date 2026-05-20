// GET /api/web-guides/[slug]/download
//
// Streams the pre-generated self-contained HTML file for this guide,
// with the buyer's email substituted into the watermark placeholder.
// The heavy rendering work (image inlining etc.) happens once in the
// admin's browser at publish time and is stored in Supabase Storage;
// this endpoint just fetches and streams, well inside Workers Free
// CPU limits.
//
// Two ways to authorise:
//   • ?session_id=cs_… — fresh from Stripe Checkout. Verified
//     against Stripe; no sign-in required. The guest-purchase path.
//   • Signed-in user with a row in web_guide_purchases — for
//     repeat downloads by someone who already has an account.
//
// Premium does NOT grant download access (per current policy).

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe'
import { getPublishedWebGuideBySlug } from '@/lib/guides-content-db'
import { userHasPurchasedWebGuide } from '@/lib/web-guide-purchases-db'
import { claimWebGuidePurchase } from '@/lib/claim-web-guide-purchase'
import { applyWatermark } from '@/lib/web-guide-download'
import { downloadFilenameFor } from '@/lib/web-guide-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'guide-downloads'

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

  let buyerEmail: string | null = null

  if (sessionId) {
    // Guest checkout return path. Verify with Stripe directly.
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
    const claim = await claimWebGuidePurchase({ session })
    buyerEmail = (claim.ok && claim.email)
      ? claim.email
      : session.customer_details?.email ?? session.customer_email ?? null
  } else {
    // Authenticated path. Signed-in users with a recorded purchase.
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

  // Fetch the pre-generated HTML from Supabase Storage.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
  }
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data, error } = await admin.storage.from(BUCKET).download(`${guide.slug}.html`)
  if (error || !data) {
    return NextResponse.json(
      { error: 'Download file not generated yet. Ask the admin to publish the guide.' },
      { status: 503 },
    )
  }

  const html = await data.text()
  const watermarked = applyWatermark(html, buyerEmail)
  const filename = downloadFilenameFor(guide)

  return new NextResponse(watermarked, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
