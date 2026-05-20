// POST /api/admin/guides/[id]/upload-download
//
// Admin browser sends the pre-rendered HTML body. We forward it to
// Supabase Storage as `{slug}.html` in the guide-downloads bucket,
// overwriting any previous version. Tiny CPU work on our side —
// just a pass-through upload — well inside the 10ms Workers Free
// per-request budget.

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
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

  const html = await request.text()
  if (!html || html.length < 200) {
    return NextResponse.json({ error: 'HTML body missing or too small' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
  }
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const path = `${guide.slug}.html`
  const { error } = await admin.storage.from(BUCKET).upload(path, html, {
    contentType: 'text/html; charset=utf-8',
    upsert: true,
    cacheControl: '0', // download endpoint sets its own cache
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, path, bytes: html.length })
}
