import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Admin-only diagnostic: ask Supabase what's actually in our buckets
// using the same service-role path the guide-URL endpoint uses.
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
  const cookieStore = await cookies()
  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )

  const result: Record<string, unknown> = {}

  for (const bucket of ['guide-files', 'guide-previews']) {
    const { data, error } = await admin.storage.from(bucket).list('', { limit: 100 })
    result[bucket] = error
      ? { error: error.message }
      : (data ?? []).map(f => ({
          name: f.name,
          size: f.metadata?.size,
          mime: f.metadata?.mimetype,
          updated_at: f.updated_at,
        }))
  }

  // Also list bucket metadata itself
  const { data: buckets, error: bucketsErr } = await admin.storage.listBuckets()
  result._all_buckets = bucketsErr
    ? { error: bucketsErr.message }
    : (buckets ?? []).map(b => ({ name: b.name, public: b.public, created_at: b.created_at }))

  return NextResponse.json(result, { status: 200 })
}
