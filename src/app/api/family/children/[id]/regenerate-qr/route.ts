import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/family/children/[id]/regenerate-qr
// Rotate the child's qr_token, invalidating the old URL. Use this if a
// shared link leaks, or if a kid graduates out of the app and the
// parent wants the old QR card to stop working.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  }

  const newToken = randomUUID()
  const { error } = await supabase
    .from('children')
    .update({ qr_token: newToken })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ qr_token: newToken })
}
