import { NextResponse } from 'next/server'
import { recordHeartbeat } from '@/lib/live-sessions-db'

export const dynamic = 'force-dynamic'

// Public heartbeat endpoint. Every browser tab pings this every ~30s
// while it's open so the admin live-count card can show how many
// people are on the site right now. No auth, no PII: just an opaque
// session id generated client-side and the current pathname.
//
// Worst case for abuse is someone inflating the active-session count
// with junk session ids. The card is for our eyes only and rows get
// swept after 5 minutes, so the impact tops out at "the number on
// the admin card looks a bit higher than reality for a minute".
export async function POST(request: Request) {
  let body: { session_id?: unknown; pathname?: unknown } = {}
  try { body = await request.json() } catch {}

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : ''
  const pathname = typeof body.pathname === 'string' ? body.pathname.trim() : ''

  // session_id must look like a UUID-ish string. Keep the check loose
  // so we don't have to lock the client into one format, but reject
  // empty / unreasonably long values.
  if (!sessionId || sessionId.length > 80) {
    return NextResponse.json({ error: 'Bad session_id' }, { status: 400 })
  }
  // pathname is purely informational — clamp length so a malicious
  // client can't store huge strings in the table.
  const safePathname = pathname.slice(0, 200) || '/'

  try {
    await recordHeartbeat(sessionId, safePathname)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    console.error('[heartbeat]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
