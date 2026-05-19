import { NextResponse } from 'next/server'
import { getChildByToken } from '@/lib/passport-kid-db'
import { createKidJournalEntry } from '@/lib/passport-journal-db'
import { getPackMeta } from '@/lib/adventurePackData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/kid/[token]/journal
// Body: { text?, emoji_rating?, country_slug? }
// Kid-mode journal write. Refused for view-only children. Country
// slug, if present, must be a known pack.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const child = await getChildByToken(token)
  if (!child) {
    return NextResponse.json({ error: 'Passport not found' }, { status: 404 })
  }
  if (child.permission_mode === 'view') {
    return NextResponse.json(
      { error: 'This passport is view-only. Ask a grown-up to write something.' },
      { status: 403 },
    )
  }

  let body: { text?: string; emoji_rating?: string; country_slug?: string | null } = {}
  try { body = await request.json() } catch {}

  let countrySlug: string | null = null
  if (body.country_slug) {
    if (!getPackMeta(body.country_slug)) {
      return NextResponse.json({ error: 'Unknown country.' }, { status: 400 })
    }
    countrySlug = body.country_slug
  }

  const result = await createKidJournalEntry({
    childId: child.id,
    countrySlug,
    text: body.text,
    emojiRating: body.emoji_rating,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, id: result.id })
}
