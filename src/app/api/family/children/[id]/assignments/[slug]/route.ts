import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// DELETE /api/family/children/[id]/assignments/[slug]
// Unassign an Adventure Pack from a child. RLS handles ownership.
// Existing kid_adventure_pack_sessions for that pack are left in place
// — if you re-assign later, the kid's progress is still there.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; slug: string }> },
) {
  const { id, slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  }

  const { error } = await supabase
    .from('child_pack_assignments')
    .delete()
    .eq('child_id', id)
    .eq('country_slug', slug)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
