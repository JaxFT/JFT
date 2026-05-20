// POST /api/admin/guides/[id]/upload-download
//
// Admin browser sends the pre-rendered HTML body; we forward it to
// Supabase Storage as `{slug}.html` (overwrite if exists).
//
// We deliberately use the raw fetch against Supabase's storage REST
// API rather than the @supabase/supabase-js client because:
//   • the request body is streamed straight through (request.body
//     is a ReadableStream), so we never buffer the 5MB+ HTML in
//     worker memory or hit CPU encoding it;
//   • avoids whatever client-side serialisation the JS client does
//     that was tripping Workers Free's 10ms / memory limits.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { getWebGuideById } from '@/lib/guides-content-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'guide-downloads'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  const guide = await getWebGuideById(id)
  if (!guide) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Storage credentials not configured' }, { status: 500 })
  }

  const path = `${guide.slug}.html`
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`

  // Stream the incoming body straight through to Supabase. No
  // intermediate buffering, no JS client serialisation. The actual
  // bytes never touch worker CPU.
  let upstream: Response
  try {
    upstream = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': request.headers.get('content-type') ?? 'text/html; charset=utf-8',
        'x-upsert': 'true',
        'Cache-Control': '0',
      },
      body: request.body,
      // @ts-expect-error duplex required by Node 18+ when body is a stream
      duplex: 'half',
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Upload pipe failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 502 },
    )
  }

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => '')
    return NextResponse.json(
      { error: `Supabase responded ${upstream.status}: ${body || upstream.statusText}` },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, path })
}
