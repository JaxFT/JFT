import { NextResponse } from 'next/server'
import {
  resolveKidPack,
  loadKidPack,
  clearKidPack,
} from '@/lib/passport-kid-pack-db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/kid/[token]/pack/[slug]
// Returns the kid's full pack state in one shot: age mode, completed
// missions, all section answers. Used by the kid hook on first mount.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; slug: string }> },
) {
  const { token, slug } = await params
  const resolved = await resolveKidPack(token, slug)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }
  if (!resolved.isAssigned) {
    return NextResponse.json({ error: 'This pack hasn\'t been assigned to you yet.' }, { status: 403 })
  }
  const loaded = await loadKidPack(resolved.child.id, slug)
  return NextResponse.json(loaded)
}

// DELETE /api/kid/[token]/pack/[slug]
// Wipes session + answers for this child + pack. country_visits row
// is intentionally preserved.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string; slug: string }> },
) {
  const { token, slug } = await params
  const resolved = await resolveKidPack(token, slug)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }
  if (!resolved.isAssigned) {
    return NextResponse.json({ error: 'Not assigned.' }, { status: 403 })
  }
  await clearKidPack(resolved.child.id, slug)
  return NextResponse.json({ ok: true })
}
