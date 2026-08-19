// POST /api/recommendations/[id]/vote — toggle the signed-in user's
// up/down vote. Same click-again-to-remove behaviour as blog post
// likes: existing vote with the same value gets deleted, a different
// value gets flipped, no existing vote gets inserted.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  const value = Number(body.value)
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: 'value must be 1 or -1' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('recommendation_votes')
    .select('value')
    .eq('recommendation_id', recommendationId)
    .eq('user_id', user.id)
    .maybeSingle()

  let myVote: 1 | -1 | null = value as 1 | -1
  if (existing?.value === value) {
    const { error } = await supabase
      .from('recommendation_votes')
      .delete()
      .eq('recommendation_id', recommendationId)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    myVote = null
  } else if (existing) {
    const { error } = await supabase
      .from('recommendation_votes')
      .update({ value })
      .eq('recommendation_id', recommendationId)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('recommendation_votes')
      .insert({ recommendation_id: recommendationId, user_id: user.id, value })
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const { data: allVotes } = await supabase
    .from('recommendation_votes')
    .select('value')
    .eq('recommendation_id', recommendationId)
  const up_votes = (allVotes ?? []).filter(v => v.value === 1).length
  const down_votes = (allVotes ?? []).filter(v => v.value === -1).length

  return NextResponse.json({ ok: true, up_votes, down_votes, my_vote: myVote })
}
