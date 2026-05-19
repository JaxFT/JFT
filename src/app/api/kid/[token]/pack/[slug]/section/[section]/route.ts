import { NextResponse } from 'next/server'
import { resolveKidPack, saveKidSection } from '@/lib/passport-kid-pack-db'
import { SECTION_KEYS, type SectionKey, type SectionAnswers } from '@/lib/adventurePackTypes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PUT /api/kid/[token]/pack/[slug]/section/[section]
// Body: arbitrary jsonb of the section's answers.
// Called from the kid hook on the debounced-save tick (~1s after the
// last edit). Whole-section replacement, not partial merge.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string; slug: string; section: string }> },
) {
  const { token, slug, section } = await params
  if (!(SECTION_KEYS as readonly string[]).includes(section)) {
    return NextResponse.json({ error: 'Unknown section.' }, { status: 400 })
  }
  const resolved = await resolveKidPack(token, slug)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }
  if (!resolved.isAssigned) {
    return NextResponse.json({ error: 'Not assigned.' }, { status: 403 })
  }

  let answers: SectionAnswers = {}
  try {
    const body = await request.json()
    if (body && typeof body === 'object') answers = body as SectionAnswers
  } catch {}

  await saveKidSection(resolved.child.id, slug, section as SectionKey, answers)
  return NextResponse.json({ ok: true })
}
