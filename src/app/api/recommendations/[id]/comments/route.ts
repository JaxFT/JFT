// GET list comments on a recommendation (with author names resolved) —
// public read, matching the recommendation itself. POST add one, that
// still requires an account.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { createNotification } from '@/lib/notifications'
import { shortName } from '@/lib/display-name'
import { containsBlockedWord } from '@/lib/profanity-filter'
import { logModerationItem } from '@/lib/moderation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_LENGTH = 500

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: recommendationId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recommendation_comments')
    .select('id, user_id, body, created_at')
    .eq('recommendation_id', recommendationId)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const authors = await getPublicProfilesByIds([...new Set(rows.map(r => r.user_id))])
  const comments = rows.map(r => ({ ...r, author: authors.get(r.user_id) ?? null }))

  return NextResponse.json({ ok: true, comments })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: recommendationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!text) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Comments are capped at ${MAX_LENGTH} characters` }, { status: 400 })
  }
  if (containsBlockedWord(text)) {
    return NextResponse.json({ error: "That comment can't be posted as written." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('recommendation_comments')
    .insert({ recommendation_id: recommendationId, user_id: user.id, body: text })
    .select('id, user_id, body, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profile } = await supabase.from('profiles').select('username, full_name').eq('id', user.id).maybeSingle()

  const { data: recommendation } = await supabase
    .from('recommendations')
    .select('user_id, place_name')
    .eq('id', recommendationId)
    .maybeSingle()
  if (recommendation) {
    const name = shortName(profile?.full_name) || 'Someone'
    const link = `/recommendations?user=${recommendation.user_id}`
    await createNotification({
      userId: recommendation.user_id,
      actorUserId: user.id,
      type: 'recommendation_comment',
      message: `${name} commented on your recommendation for ${recommendation.place_name}`,
      link,
    })
    await logModerationItem({
      contentType: 'recommendation_comment',
      contentId: data.id,
      authorUserId: user.id,
      bodySnapshot: text,
      contextLabel: `Comment on "${recommendation.place_name}"`,
      contextLink: link,
    })
  }

  return NextResponse.json({
    ok: true,
    comment: { ...data, author: { id: user.id, username: profile?.username ?? null, full_name: profile?.full_name ?? null } },
  })
}
