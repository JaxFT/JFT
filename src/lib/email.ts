// Outgoing-email helper backed by Resend.
//
// Two sender identities are configured against the verified domain:
//   - hello@jaxfamilytravels.com: generic site sender (welcome, notifs)
//   - bec@jaxfamilytravels.com:   personal sender for replies / confirms
//
// All incoming mail to either address forwards to jaxfamilytravels7@gmail.com
// via Cloudflare Email Routing (configured in the Cloudflare dashboard,
// nothing in this codebase touches incoming mail).
//
// If RESEND_API_KEY is not set, sendEmail returns ok: false silently.
// The caller decides whether that's a hard failure. For non-critical
// notifications we don't want to break the user flow if email fails.

import { Resend } from 'resend'
import { buildUnsubscribeUrl } from '@/lib/unsubscribe-token'

export const HELLO_FROM = 'Jax | Family Travels <hello@jaxfamilytravels.com>'
export const BEC_FROM   = 'Bec at Jax | Family Travels <bec@jaxfamilytravels.com>'
export const INBOX      = 'hello@jaxfamilytravels.com'  // forwards to gmail
export const ADMIN_NOTIFY = 'hello@jaxfamilytravels.com'

type SendArgs = {
  from?: string
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export async function sendEmail({
  from = HELLO_FROM, to, subject, html, text, replyTo,
}: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' }

  try {
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: data?.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Email failed' }
  }
}

// ─── Template helpers ────────────────────────────────────────────────
// Plain HTML templates, no React, no framework. Resend accepts raw HTML.
// Brand colours match the site (brand-600 = #2d6b4f).

const BASE_STYLES = `
  body { margin: 0; padding: 0; background: #f5f4f1; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #1a1a18; line-height: 1.6; }
  .wrap { max-width: 560px; margin: 24px auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #eaeaea; }
  .header { background: #2d6b4f; color: white; padding: 22px 28px; }
  .header .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.7; margin: 0 0 6px 0; }
  .header h1 { font-size: 20px; font-weight: 700; margin: 0; }
  .body { padding: 28px; font-size: 15px; }
  .body p { margin: 0 0 14px 0; }
  .body a { color: #2d6b4f; }
  .footer { padding: 18px 28px; font-size: 12px; color: #888; background: #fafaf8; border-top: 1px solid #eaeaea; }
  .kv { background: #f5f4f1; border-radius: 8px; padding: 14px 18px; margin: 14px 0; }
  .kv-row { display: flex; gap: 10px; margin: 4px 0; font-size: 14px; }
  .kv-label { color: #888; font-weight: 600; min-width: 110px; }
  .kv-value { color: #1a1a18; flex: 1; }
  .btn { display: inline-block; background: #2d6b4f; color: white !important; text-decoration: none; padding: 11px 22px; border-radius: 8px; font-weight: 600; font-size: 14px; }
`

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function emailShell(headerTitle: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(headerTitle)}</title>
<style>${BASE_STYLES}</style>
</head><body>
  <div class="wrap">
    <div class="header">
      <p class="brand">Jax | Family Travels</p>
      <h1>${escapeHtml(headerTitle)}</h1>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">jaxfamilytravels.com &middot; Real travel for real families.</div>
  </div>
</body></html>`
}

// ─── Templates ───────────────────────────────────────────────────────

export type CallRequestPayload = {
  name: string
  email: string
  familySituation: string | null
  whereNow: string | null
  journeyStage: string | null
  whatToDiscuss: string
  timezone: string | null
  preferredDays: string[]
  preferredTimes: string[]
}

// Notification TO us (forwards to gmail) when someone fills the form.
export function buildCallRequestNotificationEmail(p: CallRequestPayload): { subject: string; html: string; text: string } {
  const subject = `New call request, ${p.name}`
  const stageLabel = p.journeyStage
    ? ({
        dreaming: 'Dreaming about it',
        planning: 'Actively planning',
        soon: 'Leaving soon',
        already: 'Already on the road',
      } as Record<string, string>)[p.journeyStage] ?? p.journeyStage
    : null

  const dayLabel: Record<string, string> = {
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
  }
  const timeLabel: Record<string, string> = {
    morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
  }
  const days = p.preferredDays.map(d => dayLabel[d] ?? d).join(', ') || null
  const times = p.preferredTimes.map(t => timeLabel[t] ?? t).join(', ') || null

  const rows: Array<[string, string | null]> = [
    ['Name', p.name],
    ['Email', p.email],
    ['Family', p.familySituation],
    ['Based in', p.whereNow],
    ['Stage', stageLabel],
    ['Timezone', p.timezone],
    ['Preferred days', days],
    ['Preferred times', times],
  ]
  const kvHtml = rows
    .filter(([, v]) => !!v && v.trim().length > 0)
    .map(([k, v]) => `<div class="kv-row"><span class="kv-label">${escapeHtml(k)}</span><span class="kv-value">${escapeHtml(v as string)}</span></div>`)
    .join('')

  const bodyHtml = `
    <p>Someone just submitted the work-with-us form.</p>
    <div class="kv">${kvHtml}</div>
    <p style="margin-top:18px"><strong>What they want to discuss</strong></p>
    <p style="white-space:pre-wrap; background:#f5f4f1; padding:14px 18px; border-radius:8px;">${escapeHtml(p.whatToDiscuss)}</p>
    <p style="margin-top:22px">Reply directly to this email to get back to them, the reply-to is set to their address.</p>
  `

  const text = [
    `New call request, ${p.name}`,
    '',
    ...rows.filter(([, v]) => !!v).map(([k, v]) => `${k}: ${v}`),
    '',
    'What they want to discuss:',
    p.whatToDiscuss,
  ].join('\n')

  return { subject, html: emailShell(subject, bodyHtml), text }
}

// Confirmation TO the requester so they know we got it.
export function buildCallRequestConfirmationEmail(p: { name: string; whatToDiscuss: string }): { subject: string; html: string; text: string } {
  const subject = 'We got your call request'
  const firstName = p.name.split(' ')[0] || p.name
  const bodyHtml = `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Thanks for getting in touch, we've got your request and one of us (probably Bec) will be back within 48 hours with proposed times and pricing.</p>
    <p>Just so you have it on record, here's what you sent:</p>
    <p style="white-space:pre-wrap; background:#f5f4f1; padding:14px 18px; border-radius:8px; font-size:14px;">${escapeHtml(p.whatToDiscuss)}</p>
    <p>If anything else comes to mind before we reply, just hit reply to this email.</p>
    <p style="margin-top:22px">Speak soon,<br>Bec &amp; Oli</p>
  `

  const text = `Hi ${firstName},

Thanks for getting in touch, we've got your request and one of us (probably Bec) will be back within 48 hours with proposed times and pricing.

What you sent:
${p.whatToDiscuss}

If anything else comes to mind before we reply, just hit reply to this email.

Speak soon,
Bec & Oli`

  return { subject, html: emailShell(subject, bodyHtml), text }
}

// When the admin posts a new message in a call-request thread, the
// requesting user gets this email. We don't include the body of the
// reply in the email body itself, the source of truth is the thread
// in their account so they always come back to the site.
export function buildCallThreadReplyToUserEmail(p: {
  firstName: string
  siteUrl: string
}): { subject: string; html: string; text: string } {
  const subject = 'New message about your call request'
  const threadUrl = `${p.siteUrl}/account#call-request`
  const bodyHtml = `
    <p>Hi ${escapeHtml(p.firstName)},</p>
    <p>We've just replied to your 1:1 call request. Open the thread in your account to read it and reply.</p>
    <p style="margin-top:18px"><a href="${threadUrl}" style="background:#2d6b4f; color:#fff; padding:10px 16px; border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">Open the thread</a></p>
    <p style="margin-top:22px">Speak soon,<br>Bec &amp; Oli</p>
  `
  const text = `Hi ${p.firstName},

We've just replied to your 1:1 call request. Open the thread in your account to read it and reply: ${threadUrl}

Speak soon,
Bec & Oli`
  return { subject, html: emailShell(subject, bodyHtml), text }
}

// When the user replies in a call-request thread, the admin inbox
// gets this nudge. Reply-to is the requester's email so a hit-reply
// from Gmail still lands in the right place if Bec / Oli prefer email.
export function buildCallThreadReplyToAdminEmail(p: {
  requesterName: string
  body: string
  siteUrl: string
  requestId: string
}): { subject: string; html: string; text: string } {
  const subject = `New reply from ${p.requesterName} on a call request`
  const adminUrl = `${p.siteUrl}/admin/call-requests#${p.requestId}`
  const bodyHtml = `
    <p>${escapeHtml(p.requesterName)} just replied in their call-request thread.</p>
    <p style="white-space:pre-wrap; background:#f5f4f1; padding:14px 18px; border-radius:8px;">${escapeHtml(p.body)}</p>
    <p style="margin-top:18px"><a href="${adminUrl}" style="background:#2d6b4f; color:#fff; padding:10px 16px; border-radius:6px; text-decoration:none; font-weight:bold; display:inline-block;">Open the thread</a></p>
  `
  const text = `${p.requesterName} just replied in their call-request thread.

${p.body}

Open the thread: ${adminUrl}`
  return { subject, html: emailShell(subject, bodyHtml), text }
}

// Build a small "Unsubscribe" footer block for any marketing email.
// Returns empty strings if the signing secret isn't configured so the
// email can still go out, but you should NOT send marketing emails
// without an unsubscribe link, so check the result before sending.
export async function buildUnsubscribeFooter(userId: string): Promise<{ html: string; text: string }> {
  const url = await buildUnsubscribeUrl(userId)
  if (!url) return { html: '', text: '' }
  return {
    html: `<p style="margin-top:24px; font-size:12px; color:#888;">Don't want these emails? <a href="${url}" style="color:#888;">Unsubscribe in one click</a>.</p>`,
    text: `\n\nDon't want these emails? Unsubscribe: ${url}`,
  }
}

// Welcome email when a new account first signs in.
export function buildWelcomeEmail(p: { name: string | null; siteUrl: string }): { subject: string; html: string; text: string } {
  const subject = 'Welcome to Jax | Family Travels'
  const greeting = p.name?.trim()
    ? `Hi ${escapeHtml(p.name.split(' ')[0])},`
    : 'Hi there,'

  const bodyHtml = `
    <p>${greeting}</p>
    <p>Glad to have you. We built this site for families who are actually trying to do long-term travel, honest guides, real numbers, what worked with our 8-year-old and what didn't.</p>
    <p>A few places to start:</p>
    <ul>
      <li><a href="${p.siteUrl}/i-want-to-travel">The I Want To Travel tool</a>, a quick assessment of whether long-term travel is realistic for your family right now</li>
      <li><a href="${p.siteUrl}/blog">The blog</a>, what we're actually doing on the road</li>
      <li><a href="${p.siteUrl}/guides">Destination guides</a></li>
    </ul>
    <p>If you want to talk one-to-one, <a href="${p.siteUrl}/work-with-us">book a call</a>, we&apos;ll talk through your specific plans.</p>
    <p>Reply to this email any time. It comes through to us.</p>
    <p style="margin-top:22px">Bec &amp; Oli</p>
  `

  const text = `${greeting.replace(/&[a-z#0-9]+;/g, '')}

Glad to have you. We built this site for families who are actually trying to do long-term travel, honest guides, real numbers, what worked with our 8-year-old and what didn't.

A few places to start:
- The I Want To Travel tool: ${p.siteUrl}/i-want-to-travel
- The blog: ${p.siteUrl}/blog
- Destination guides: ${p.siteUrl}/guides

If you want to talk one-to-one, book a call: ${p.siteUrl}/work-with-us

Reply to this email any time. It comes through to us.

Bec & Oli`

  return { subject, html: emailShell(subject, bodyHtml), text }
}
