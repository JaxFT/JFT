import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// POST /api/guides/[slug]/view
// Public fire-and-forget. Increments products.view_count for the given
// legacy PDF guide slug via the increment_legacy_guide_view RPC, unless
// the viewer is an admin. Direct mirror of /api/web-guides/[slug]/view.
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Bad slug' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && isAdminEmail(user.email)) {
    return NextResponse.json({ ok: true, skipped: 'admin' })
  }

  const { error } = await supabase.rpc('increment_legacy_guide_view', { p_slug: slug })
  if (error) {
    console.error('[legacy guide view]', error.message)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
  return NextResponse.json({ ok: true })
}
