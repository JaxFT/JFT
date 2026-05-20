// Edge-cached image proxy.
//
//   GET /img/{bucket}/{...object-path}
//     → fetches from
//       {NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
//     → returns with Cache-Control: public, max-age=31536000, immutable
//
// Cloudflare's edge then caches every response globally; subsequent
// hits never touch Supabase. Storage objects in the public bucket are
// effectively immutable (admin overwrites would just be new files), so
// the year-long TTL is safe.
//
// Non-image responses pass through with their original content-type so
// SVG flags, JSON manifests etc. still render correctly if needed.

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

const SUPABASE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!SUPABASE_BASE) {
    return new NextResponse('Image host not configured', { status: 500 })
  }
  const { path } = await params
  if (!path?.length) {
    return new NextResponse('Not found', { status: 404 })
  }

  const upstreamUrl =
    `${SUPABASE_BASE}/storage/v1/object/public/${path.map(encodeURIComponent).join('/')}`

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl)
  } catch {
    return new NextResponse('Upstream fetch failed', { status: 502 })
  }
  if (!upstream.ok) {
    return new NextResponse('Not found', { status: upstream.status })
  }

  const headers = new Headers()
  const ct = upstream.headers.get('content-type')
  if (ct) headers.set('content-type', ct)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  // Hint to Cloudflare to cache even for browsers with no-cache.
  headers.set('cdn-cache-control', 'public, max-age=31536000, immutable')

  return new NextResponse(upstream.body, { status: 200, headers })
}
