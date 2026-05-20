// GET /api/web-guides/[slug]/download
// Streams a self-contained HTML file of the guide to the buyer.
// Auth + purchase check guard the file — premium does NOT grant
// download access per current policy (premium = web reading only).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPublishedWebGuideBySlug } from '@/lib/guides-content-db'
import { userHasPurchasedWebGuide } from '@/lib/web-guide-purchases-db'
import { renderGuideHtml, downloadFilenameFor } from '@/lib/web-guide-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const guide = await getPublishedWebGuideBySlug(slug)
  if (!guide) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  const purchased = await userHasPurchasedWebGuide(user.id, guide.id)
  if (!purchased) {
    return NextResponse.json({ error: 'You have not purchased this guide.' }, { status: 403 })
  }

  const html = await renderGuideHtml(guide, user.email ?? null)
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
