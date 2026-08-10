// POST a FormData `file` field to set/replace the Travel Profile hero
// photo. Only one photo is ever kept — the previous storage object is
// deleted when replacing, on purpose (see product spec: this isn't a
// photo library, just a single chosen representation).
//
// DELETE removes the current photo entirely (goes back to no hero
// image, not a fallback image).

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'travel-profile-photos'

function admin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.')
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// Storage path from a public bucket URL, so the old object can be
// deleted when replacing. Returns null if the URL doesn't look like
// one of ours (defensive, shouldn't happen).
function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  return i === -1 ? null : url.slice(i + marker.length)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  // Client-side resizeImageIfLarge already downscales anything big
  // before it gets here, this cap is just a backstop against someone
  // bypassing that (a raw API call, a weird browser).
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: 'Photo too large (max 15 MB)' }, { status: 413 })
  }
  const mime = file.type || 'application/octet-stream'
  if (!mime.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
  }

  const sb = admin()

  // Look up (and later delete) the previous photo, if any.
  const { data: existing } = await sb
    .from('travel_profiles')
    .select('hero_photo_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'jpg').toLowerCase()
  const random = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  const path = `${user.id}/${random}.${ext}`

  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadErr } = await sb.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false })
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path)
  const { error: upsertErr } = await sb
    .from('travel_profiles')
    .upsert(
      { user_id: user.id, hero_photo_url: pub.publicUrl, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  // Best-effort cleanup of the old object, after the new one is
  // safely referenced, a failure here shouldn't fail the request.
  const oldPath = existing?.hero_photo_url ? pathFromPublicUrl(existing.hero_photo_url) : null
  if (oldPath) {
    await sb.storage.from(BUCKET).remove([oldPath]).catch(() => null)
  }

  return NextResponse.json({ ok: true, url: pub.publicUrl })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const sb = admin()
  const { data: existing } = await sb
    .from('travel_profiles')
    .select('hero_photo_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = await sb
    .from('travel_profiles')
    .update({ hero_photo_url: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const oldPath = existing?.hero_photo_url ? pathFromPublicUrl(existing.hero_photo_url) : null
  if (oldPath) {
    await sb.storage.from(BUCKET).remove([oldPath]).catch(() => null)
  }

  return NextResponse.json({ ok: true })
}
