import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { getGuideBySlug, userHasPurchased, PREVIEWS_BUCKET, FULL_BUCKET } from '@/lib/guides-db'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { isAdminEmail } from '@/lib/admin'
import { stripeClient } from '@/lib/stripe'
import { claimGuidePurchase } from '@/lib/claim-guide-purchase'

export const dynamic = 'force-dynamic'

// Returns a short-lived signed URL the iframe / download anchor can load.
// kind=preview → public preview PDF, available to anyone.
// kind=full    → full PDF, gated to premium subscribers and one-off purchasers.
//
// Two ways to authorise full/download, same as the web-guide download
// route:
//   • ?session_id=cs_… — fresh from Stripe Checkout, guest-purchase
//     path, no sign-in required. Verified against Stripe.
//   • Signed-in user with a row in purchases (repeat visits) or an
//     active Premium subscription.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind') ?? 'preview'
  const sessionId = searchParams.get('session_id')

  const guide = await getGuideBySlug(slug)
  if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })

  if (kind === 'preview') {
    if (!guide.preview_path) {
      return NextResponse.json({ error: 'Preview not available yet' }, { status: 404 })
    }
    const result = await signedUrlForBucket(PREVIEWS_BUCKET, guide.preview_path, 300)
    if (!result.url) return NextResponse.json({ error: result.error ?? 'Preview unavailable' }, { status: 500 })
    return NextResponse.json({ url: result.url })
  }

  if (kind !== 'full' && kind !== 'download') {
    return NextResponse.json({ error: 'Unknown kind' }, { status: 400 })
  }

  let authorised = false

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
    if (session.metadata?.product_id !== guide.id) {
      return NextResponse.json({ error: 'Session is for a different guide' }, { status: 403 })
    }
    // Idempotent — also the webhook's backstop, whichever fires first wins.
    const claim = await claimGuidePurchase({ session })
    if (!claim.ok) {
      return NextResponse.json({ error: claim.error }, { status: claim.status })
    }
    authorised = true
  } else {
    // Full-PDF access, premium subscribers can view, one-off purchasers can view + download
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    const isPremium = isPremiumTier(profile?.subscription_tier)
    const hasPurchased = await userHasPurchased(user.id, guide.id)
    // Admins bypass purchase + premium checks so they can pull any
    // guide for QA without paying.
    const admin = isAdminEmail(user.email)

    if (kind === 'download' && !hasPurchased && !admin) {
      return NextResponse.json(
        { error: 'Download is only available with a one-off purchase. Premium members can read on-site but cannot download.' },
        { status: 403 },
      )
    }
    if (kind === 'full' && !isPremium && !hasPurchased && !admin) {
      return NextResponse.json({ error: 'Upgrade or buy this guide to view it' }, { status: 403 })
    }
    authorised = true
  }

  if (!authorised) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  if (!guide.full_path) {
    return NextResponse.json({ error: 'Full guide not uploaded yet' }, { status: 404 })
  }

  const result = await signedUrlForBucket(FULL_BUCKET, guide.full_path, 300)
  if (!result.url) {
    return NextResponse.json(
      { error: result.error ?? 'Could not generate URL', bucket: FULL_BUCKET, path: guide.full_path },
      { status: 500 },
    )
  }
  return NextResponse.json({ url: result.url })
}

type SignedUrlResult = { url: string | null; error?: string }

async function signedUrlForBucket(bucket: string, path: string, expiresSeconds: number): Promise<SignedUrlResult> {
  // Service role bypasses RLS. Use plain @supabase/supabase-js client.
  // NOT @supabase/ssr's createServerClient, which folds in the caller's
  // session cookie and overrides the service-role JWT, silently
  // downgrading auth to user-level and breaking private-bucket access.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return { url: null, error: 'SUPABASE_SERVICE_ROLE_KEY not set as a Worker secret' }
  const supabase = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresSeconds)
  if (error || !data) {
    return { url: null, error: error?.message ?? 'Unknown storage error' }
  }
  return { url: data.signedUrl }
}
