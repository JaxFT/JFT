import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { FULL_BUCKET } from '@/lib/guides-db'
import { getWebGuideById } from '@/lib/guides-content-db'

export const dynamic = 'force-dynamic'

// Upload (or replace) the downloadable PDF for a web guide. The PDF
// is what the admin prints from /admin/guides/[id]/print, saves
// locally, then drops back here. Stored in the existing guide-files
// bucket at web/<slug>.pdf so legacy + web PDFs share infra.

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false as const, user: null, supabase }
  return { ok: true as const, user, supabase }
}

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  const { id } = await params

  const guide = await getWebGuideById(id)
  if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file field in upload' }, { status: 400 })
  }
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'PDF exceeds 50 MB' }, { status: 413 })

  const path = `web/${guide.slug}.pdf`
  const sb = serviceClient()
  const { error: upErr } = await sb.storage.from(FULL_BUCKET).upload(path, file, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Record the path on the row.
  const { error: dbErr } = await auth.supabase
    .from('guides')
    .update({ pdf_path: path })
    .eq('id', id)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, pdf_path: path, size: file.size })
}

// Remove the PDF (deletes the file in storage and clears pdf_path).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  const { id } = await params

  const guide = await getWebGuideById(id)
  if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  if (!guide.pdf_path) return NextResponse.json({ ok: true })

  const sb = serviceClient()
  // Best effort — even if storage delete fails we still clear the column
  // so the row doesn't keep pointing at a phantom file.
  await sb.storage.from(FULL_BUCKET).remove([guide.pdf_path]).catch(() => null)

  const { error: dbErr } = await auth.supabase
    .from('guides')
    .update({ pdf_path: null })
    .eq('id', id)
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
