// GET /api/web-guides/[slug]/download
//
// Authorises the request (Stripe session_id OR signed-in user with a
// purchase row) then redirects the browser to a short-lived signed
// URL on Supabase Storage for the pre-generated HTML file. Supabase
// serves the bytes directly — our worker never reads the file body,
// so download size has zero impact on Worker CPU usage. Trivially
// inside the 10ms Workers Free per-request limit.
//
// The signed URL expires after 60 seconds, just long enough for the
// browser to fetch the file once. Sharing the URL after that fails.
//
// Two ways to authorise:
//   • ?session_id=cs_… — fresh from Stripe Checkout. Verified
//     against Stripe; no sign-in required (guest-purchase path).
//   • Signed-in user with a row in web_guide_purchases (for repeat
//     downloads by someone who already has an account).
//
// Premium does NOT grant download access (per current policy).

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe'
import { getPublishedWebGuideBySlug } from '@/lib/guides-content-db'
import { userHasPurchasedWebGuide } from '@/lib/web-guide-purchases-db'
import { claimWebGuidePurchase } from '@/lib/claim-web-guide-purchase'
import { downloadFilenameFor } from '@/lib/web-guide-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'guide-downloads'
const SIGNED_URL_TTL_SECONDS = 60

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

  // ── Authorise ─────────────────────────────────
  if (sessionId) {
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
    // Best-effort claim so the purchase row exists even if the webhook
    // hasn't fired yet. Doesn't gate the download.
    await claimWebGuidePurchase({ session })
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    const purchased = await userHasPurchasedWebGuide(user.id, guide.id)
    if (!purchased) {
      return NextResponse.json({ error: 'You have not purchased this guide.' }, { status: 403 })
    }
  }

  // ── Mint a signed URL to the pre-baked file ────
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
  }
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const filename = downloadFilenameFor(guide)
  const { data, error } = await admin
    .storage
    .from(BUCKET)
    .createSignedUrl(`${guide.slug}.html`, SIGNED_URL_TTL_SECONDS, {
      // Force the browser to save as a file instead of opening inline,
      // with a friendly filename.
      download: filename,
    })
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: 'Download file not generated yet. Ask the admin to publish the guide.' },
      { status: 503 },
    )
  }

  // 302 redirect — browser follows it to Supabase, which serves the
  // bytes. Our worker is done; we read and wrote no file body.
  return NextResponse.redirect(data.signedUrl, 302)
}
