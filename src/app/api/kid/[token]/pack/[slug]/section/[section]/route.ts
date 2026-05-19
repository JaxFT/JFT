import { NextResponse } from 'next/server'
import { resolveKidPack, saveKidSection } from '@/lib/passport-kid-pack-db'
import { autoStampsForSection, awardOrSuggestStamp } from '@/lib/passport-stamps-db'
import { SECTION_KEYS, type SectionKey, type SectionAnswers } from '@/lib/adventurePackTypes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PUT /api/kid/[token]/pack/[slug]/section/[section]
// Body: arbitrary jsonb of the section's answers.
// Called from the kid hook on the debounced-save tick (~1s after the
// last edit). Whole-section replacement, not partial merge. After
// saving, runs the stamp engine: food interactions can fire
// BRAVE_EATER, language interactions can fire LOCAL_LINGO.
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

  // Detect and fire any auto-stamps this section save earns. The
  // engine dedupes per (child, type, country) so repeat saves are
  // safe. Just-minted stamps go back in the response so the client
  // can pop a celebration toast.
  const newStamps: Array<{ type: string; country_slug: string }> = []
  const stampsToAward = autoStampsForSection(section as SectionKey, answers)
  for (const type of stampsToAward) {
    const r = await awardOrSuggestStamp({
      childId: resolved.child.id,
      type,
      countrySlug: slug,
      awardedBy: 'system',
    })
    if (r.ok && r.created && r.status === 'awarded') {
      newStamps.push({ type, country_slug: slug })
    }
  }

  return NextResponse.json({ ok: true, newStamps })
}
