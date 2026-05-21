// Admin-only: post a 'confirmation' message into a call request
// thread. Stores the scheduled instant in UTC (computed from the
// admin's chosen wall-clock + IANA timezone) so calendars on both
// sides convert to their own local time correctly.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { adminClient } from '@/lib/call-requests-db'
import {
  sendEmail, buildCallConfirmationEmail,
  BEC_FROM, ADMIN_NOTIFY,
} from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Body = {
  date?: string          // YYYY-MM-DD wall-clock in the admin's chosen tz
  time?: string          // HH:MM 24h wall-clock in the admin's chosen tz
  timezone?: string      // IANA name, e.g. 'Europe/London'
  durationMinutes?: number
  notes?: string
}

// Compute the UTC offset (in minutes) that the IANA timezone has at
// the given UTC instant. Used to translate a wall-clock + tz into a
// canonical UTC moment that calendars elsewhere can re-localise.
function offsetMinutes(tz: string, atUtc: Date): number {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
  const parts = fmt.formatToParts(atUtc)
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
  if (tzName === 'GMT') return 0
  const m = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!m) return 0
  const sign = m[1] === '-' ? -1 : 1
  const hours = parseInt(m[2], 10)
  const mins  = m[3] ? parseInt(m[3], 10) : 0
  return sign * (hours * 60 + mins)
}

function wallClockToUtcIso(dateYmd: string, timeHm: string, tz: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null
  if (!/^\d{2}:\d{2}$/.test(timeHm))         return null
  const [y, mo, d] = dateYmd.split('-').map(Number)
  const [hh, mm]   = timeHm.split(':').map(Number)
  // Naive: pretend the wall-clock is UTC, then subtract tz's offset
  // at that approximate instant. One refinement pass handles DST
  // boundary cases (the offset at the naive guess can differ from
  // the offset at the refined guess by an hour).
  const naive = Date.UTC(y, mo - 1, d, hh, mm)
  let utcMs = naive - offsetMinutes(tz, new Date(naive)) * 60_000
  utcMs     = naive - offsetMinutes(tz, new Date(utcMs))  * 60_000
  return new Date(utcMs).toISOString()
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 404 })
  }
  const { id } = await params

  const body = (await request.json().catch(() => null)) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const tz = typeof body.timezone === 'string' && body.timezone.trim()
    ? body.timezone.trim()
    : 'Europe/London'
  // Quick sanity check: ask Intl to parse the tz, an invalid name
  // throws and we 400 instead of writing garbage.
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }) } catch {
    return NextResponse.json({ error: `Unknown timezone: ${tz}` }, { status: 400 })
  }
  const date = typeof body.date === 'string' ? body.date : ''
  const time = typeof body.time === 'string' ? body.time : ''
  const utcIso = wallClockToUtcIso(date, time, tz)
  if (!utcIso) return NextResponse.json({ error: 'Need a valid YYYY-MM-DD date and HH:MM time' }, { status: 400 })

  let durationMinutes = typeof body.durationMinutes === 'number' ? body.durationMinutes : 60
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 240) {
    durationMinutes = 60
  }
  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null

  const admin = adminClient()
  const { data: row, error: lookupErr } = await admin
    .from('call_requests')
    .select('id, name, email, user_id')
    .eq('id', id)
    .maybeSingle()
  if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  // Body text is a friendly fallback for clients that don't render the
  // confirmation card (email digests, scripted readers). Metadata is
  // the source of truth that the calendar UI reads.
  const localPretty = new Date(utcIso).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    timeZone: tz,
  })
  const fallbackBody = `Your call is confirmed for ${localPretty} (${tz}). You can add it to your calendar from the conversation.`
  const metadata = {
    scheduledAtUtc: utcIso,
    displayTimezone: tz,
    durationMinutes,
    notes: notes ?? undefined,
  }

  const { data: inserted, error } = await admin
    .from('call_request_messages')
    .insert({
      call_request_id: id,
      sender: 'admin',
      kind: 'confirmation',
      body: fallbackBody,
      metadata,
    })
    .select('id, call_request_id, sender, body, kind, metadata, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin
    .from('call_requests')
    .update({ status: 'scheduled', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Email the user a proper confirmation with the date/time spelled
  // out + an .ics attachment. Their phone/laptop calendar app will
  // re-localise the event because the ICS pins it to a UTC instant.
  const requester = row as { id: string; name: string; email: string }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  const firstName = requester.name.split(' ')[0] || requester.name
  const startUtc = new Date(utcIso)
  const endUtc = new Date(startUtc.getTime() + durationMinutes * 60 * 1000)
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const icsBody = notes
    ? notes.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
    : 'Your booked 1:1 with Bec and Oli.'
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jax Family Travels//Call Confirmation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:call-${id}@jaxfamilytravels.com`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(startUtc)}`,
    `DTEND:${dt(endUtc)}`,
    'SUMMARY:1:1 call with Jax Family Travels',
    `DESCRIPTION:${icsBody}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const m = buildCallConfirmationEmail({
    firstName,
    siteUrl,
    localTimeLabel: localPretty,
    timezoneLabel: tz,
    durationMinutes,
    notes,
  })
  const emailResult = await sendEmail({
    from: BEC_FROM,
    to: requester.email,
    subject: m.subject,
    html: m.html,
    text: m.text,
    replyTo: ADMIN_NOTIFY,
    attachments: [{ filename: 'jft-1-1-call.ics', content: ics, contentType: 'text/calendar' }],
  })
  if (!emailResult.ok) {
    // Don't fail the request, the in-app card is still the source of
    // truth, but surface the reason in the response so admin can see
    // it in the network panel + the worker logs include it via the
    // console.error in sendEmail.
    console.error('[confirm] email send failed', emailResult.error)
  }

  return NextResponse.json({
    message: inserted,
    email: emailResult.ok ? { ok: true } : { ok: false, error: emailResult.error },
  })
}
