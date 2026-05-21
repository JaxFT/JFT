import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { adminClient } from '@/lib/call-requests-db'
import {
  sendEmail, buildCallThreadReplyToUserEmail, buildCallThreadReplyToAdminEmail,
  HELLO_FROM, BEC_FROM, ADMIN_NOTIFY,
} from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type AccessCheck =
  | { ok: false; status: number; error: string }
  | { ok: true; sender: 'admin' | 'user'; request: { id: string; name: string; email: string; user_id: string | null } }

// Resolve who's posting and which request they're posting on. Used
// by both GET and POST, so the rules stay in one place.
async function resolveAccess(requestId: string): Promise<AccessCheck> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Sign in required' }

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('call_requests')
    .select('id, name, email, user_id')
    .eq('id', requestId)
    .maybeSingle()
  if (error) return { ok: false, status: 500, error: error.message }
  if (!row)  return { ok: false, status: 404, error: 'Request not found' }

  const r = row as { id: string; name: string; email: string; user_id: string | null }
  if (isAdminEmail(user.email)) return { ok: true, sender: 'admin', request: r }
  if (r.user_id === user.id)    return { ok: true, sender: 'user',  request: r }
  return { ok: false, status: 404, error: 'Request not found' }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await resolveAccess(id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const admin = adminClient()
  const { data, error } = await admin
    .from('call_request_messages')
    .select('id, call_request_id, sender, body, kind, metadata, created_at')
    .eq('call_request_id', id)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await resolveAccess(id)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = (await request.json().catch(() => null)) as { body?: string } | null
  const text = (body?.body ?? '').trim()
  if (!text) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  if (text.length > 5000) return NextResponse.json({ error: 'Keep messages under 5000 chars' }, { status: 400 })

  const admin = adminClient()
  const { data: inserted, error } = await admin
    .from('call_request_messages')
    .insert({ call_request_id: id, sender: access.sender, body: text })
    .select('id, call_request_id, sender, body, kind, metadata, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bump call_requests.updated_at so admin sees most-recent-active
  // at the top. Status transitions to 'replied' on first admin reply
  // unless it has already moved past 'new'.
  if (access.sender === 'admin') {
    await admin
      .from('call_requests')
      .update({ status: 'replied', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'new')
    await admin
      .from('call_requests')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
  } else {
    await admin
      .from('call_requests')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  // Email the other party. Fire-and-forget so a Resend hiccup doesn't
  // sink the request, the thread itself is the source of truth.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'
  if (access.sender === 'admin') {
    const firstName = access.request.name.split(' ')[0] || access.request.name
    const m = buildCallThreadReplyToUserEmail({ firstName, siteUrl })
    void sendEmail({
      from: BEC_FROM,
      to: access.request.email,
      subject: m.subject,
      html: m.html,
      text: m.text,
      replyTo: ADMIN_NOTIFY,
    })
  } else {
    const m = buildCallThreadReplyToAdminEmail({
      requesterName: access.request.name,
      body: text,
      siteUrl,
      requestId: id,
    })
    void sendEmail({
      from: HELLO_FROM,
      to: ADMIN_NOTIFY,
      subject: m.subject,
      html: m.html,
      text: m.text,
      replyTo: access.request.email,
    })
  }

  return NextResponse.json({ message: inserted })
}
