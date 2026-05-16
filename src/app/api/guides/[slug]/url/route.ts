import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { getGuideBySlug, userHasPurchased, PREVIEWS_BUCKET, FULL_BUCKET } from '@/lib/guides-db'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Returns a short-lived signed URL the iframe / download anchor can load.
// kind=preview → public preview PDF, available to anyone.
// kind=full    → full PDF, gated to premium subscribers and one-off purchasers.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind') ?? 'preview'

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

  // Full-PDF access — premium subscribers can view, one-off purchasers can view + download
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
  const isPremium = profile?.subscription_tier === 'premium'
  const hasPurchased = await userHasPurchased(user.id, guide.id)

  if (kind === 'download' && !hasPurchased) {
    return NextResponse.json(
      { error: 'Download is only available with a one-off purchase. Premium members can read on-site but cannot download.' },
      { status: 403 },
    )
  }

  if (kind === 'full' && !isPremium && !hasPurchased) {
    return NextResponse.json({ error: 'Upgrade or buy this guide to view it' }, { status: 403 })
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
  // Service role bypasses RLS. Use plain @supabase/supabase-js client —
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
