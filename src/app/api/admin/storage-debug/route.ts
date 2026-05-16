import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Admin-only diagnostic: ask Supabase what's actually in our buckets
// using a true service-role client (NOT @supabase/ssr which mixes in
// the user's session JWT and silently downgrades auth).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const result: Record<string, unknown> = {}

  // Decode the JWT payload to see what role the key actually claims
  try {
    const parts = serviceKey.split('.')
    if (parts.length === 3) {
      // base64url-decode the payload segment (middle of the JWT)
      const json = Buffer.from(parts[1], 'base64url').toString('utf-8')
      result._key_payload = JSON.parse(json)
    } else {
      result._key_payload = { error: 'Not a JWT (no 3 segments)' }
    }
  } catch (e) {
    result._key_payload = { error: e instanceof Error ? e.message : 'decode failed' }
  }

  // SDK calls — what we've been seeing
  for (const bucket of ['guide-files', 'guide-previews']) {
    const { data, error } = await admin.storage.from(bucket).list('', { limit: 100 })
    result[`${bucket}_sdk`] = error
      ? { error: error.message }
      : (data ?? []).map(f => ({ name: f.name, size: f.metadata?.size }))
  }
  const { data: bucketsSdk, error: bucketsSdkErr } = await admin.storage.listBuckets()
  result._buckets_sdk = bucketsSdkErr
    ? { error: bucketsSdkErr.message }
    : (bucketsSdk ?? []).map(b => ({ name: b.name, public: b.public }))

  // Raw HTTP call — bypasses the SDK entirely
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  try {
    const r = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    })
    const body = await r.text()
    result._buckets_raw = { status: r.status, body: body.slice(0, 500) }
  } catch (e) {
    result._buckets_raw = { error: e instanceof Error ? e.message : 'fetch failed' }
  }

  return NextResponse.json(result, { status: 200 })
}
