import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StampStatus } from '@/lib/passport-types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PATCH /api/family/children/[id]/stamps/[stamp_id]
// Body: { status: 'awarded' | 'rejected' }
// Used to approve or reject a system-suggested stamp. The parent can
// also use this to retroactively reject an awarded stamp if they
// change their mind.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stamp_id: string }> },
) {
  const { id, stamp_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  let body: { status?: string } = {}
  try { body = await request.json() } catch {}
  const status = body.status as StampStatus | undefined
  if (status !== 'awarded' && status !== 'rejected') {
    return NextResponse.json({ error: 'Status must be awarded or rejected.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('stamps')
    .update({ status, decided_at: new Date().toISOString() })
    .eq('id', stamp_id)
    .eq('child_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/family/children/[id]/stamps/[stamp_id]
// Permanently remove a stamp. Use rejection instead if you want a
// suggestion off the queue but still want a record that it was
// considered.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stamp_id: string }> },
) {
  const { id, stamp_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { error } = await supabase
    .from('stamps')
    .delete()
    .eq('id', stamp_id)
    .eq('child_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
