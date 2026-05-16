import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
    const url = await signedUrlForBucket(PREVIEWS_BUCKET, guide.preview_path, 300)
    if (!url) return NextResponse.json({ error: 'Preview unavailable' }, { status: 500 })
    return NextResponse.json({ url })
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

  const url = await signedUrlForBucket(FULL_BUCKET, guide.full_path, 300)
  if (!url) return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  return NextResponse.json({ url })
}

async function signedUrlForBucket(bucket: string, path: string, expiresSeconds: number): Promise<string | null> {
  // Service role bypasses RLS and works whether the bucket is public or private.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresSeconds)
  if (error || !data) return null
  return data.signedUrl
}
