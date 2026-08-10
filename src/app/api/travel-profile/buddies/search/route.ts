// GET ?q=<query> — search real JFT accounts by username, for the
// Travel Buddies picker. Travel buddies can only be linked to actual
// site accounts (no freeform names), so this is how the editor finds
// who to add.
//
// profiles is locked down by RLS to the owner's own row, so this has
// to run with the service role, same reasoning as blog comment
// authors and the /u/[username] lookup (see travel-profile-db.ts).
// Only username and full_name are ever returned, and only for
// authenticated callers, to keep this from being a general-purpose
// user directory.

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MIN_QUERY_LENGTH = 2
const MAX_RESULTS = 8

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < MIN_QUERY_LENGTH) return NextResponse.json({ results: [] })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ results: [] })
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Escape % and _ (ilike wildcards) so a username containing either
  // character can't be used to build an unintended pattern.
  const safe = q.replace(/[%_]/g, c => `\\${c}`)
  const { data } = await service
    .from('profiles')
    .select('id, username, full_name')
    .not('username', 'is', null)
    .ilike('username', `%${safe}%`)
    .neq('id', user.id)
    .limit(MAX_RESULTS)

  return NextResponse.json({ results: data ?? [] })
}
