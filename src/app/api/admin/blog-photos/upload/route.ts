import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'blog-photos'

// POST a FormData with `file` field. Returns the public URL the wizard
// can embed in the prompt + the final markdown.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Photo too large (max 25 MB)' }, { status: 413 })
  }
  const mime = file.type || 'application/octet-stream'
  if (!mime.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
  }

  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Path: <date>/<random>.<ext> — date prefix keeps the bucket browsable in
  // the Supabase UI; random suffix prevents collisions across uploads.
  const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'jpg').toLowerCase()
  const datePrefix = new Date().toISOString().slice(0, 10)
  const random = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  const path = `${datePrefix}/${random}.${ext}`

  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message, bucket: BUCKET, path }, { status: 500 })
  }

  // Public bucket → permanent public URL, no signing needed
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl, path })
}
