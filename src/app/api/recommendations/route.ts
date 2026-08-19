// GET list recommendations (optionally filtered by iso2/town/category),
// with each row's author username resolved for display. POST add one.
// PATCH edit the caller's own row. DELETE (?id=) removes the caller's
// own row, or — for admins — any row.
//
// Public read, like /discover — browsing works signed out. Writing
// (POST/PATCH/DELETE, and vote/comment in the [id]/ subroutes) still
// requires an account, checked here and backstopped by RLS.

import { NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import { getSocialCounts } from '@/lib/recommendation-social'
import { getBlogLinksForRecommendations } from '@/lib/recommendation-blog-links'
import { getCountryByIso2 } from '@/lib/countries'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_PER_USER = 500 // sanity cap, not a real product limit

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

type ParsedInput = {
  category: 'food' | 'attraction'
  place_name: string
  iso2: string
  town: string
  google_maps_url: string
  date_visited: string | null
  rating: number
  note: string
}

function parseInput(body: Record<string, unknown>): ParsedInput | { error: string } {
  const category = body.category === 'attraction' ? 'attraction' : body.category === 'food' ? 'food' : null
  const place_name = typeof body.place_name === 'string' ? body.place_name.trim().slice(0, 120) : ''
  const iso2 = typeof body.iso2 === 'string' ? body.iso2.toLowerCase() : ''
  const town = typeof body.town === 'string' ? body.town.trim().slice(0, 80) : ''
  const google_maps_url = typeof body.google_maps_url === 'string' ? body.google_maps_url.trim().slice(0, 500) : ''
  const date_visited = typeof body.date_visited === 'string' && body.date_visited ? body.date_visited : null
  const rating = Number(body.rating)
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''

  if (!category || !place_name || !getCountryByIso2(iso2) || !town) {
    return { error: 'Category, place name, country and town are required' }
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Rating must be 1-5' }
  }
  if (google_maps_url && !/^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl)\//.test(google_maps_url)) {
    return { error: 'Google Maps link looks wrong, paste the share link from Google Maps' }
  }
  return { category, place_name, iso2, town, google_maps_url, date_visited, rating, note }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const iso2 = searchParams.get('iso2')
  const category = searchParams.get('category')
  const userId = searchParams.get('user_id')

  let query = supabase
    .from('recommendations')
    .select('id, user_id, category, place_name, iso2, town, google_maps_url, date_visited, rating, note, created_at')
    .order('created_at', { ascending: false })

  if (iso2) query = query.eq('iso2', iso2.toLowerCase())
  if (category === 'food' || category === 'attraction') query = query.eq('category', category)
  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const authorIds = [...new Set(rows.map(r => r.user_id))]
  const [authors, socialCounts, blogLinks] = await Promise.all([
    getPublicProfilesByIds(authorIds),
    getSocialCounts(supabase, rows.map(r => r.id), user?.id ?? null),
    getBlogLinksForRecommendations(rows),
  ])

  const recommendations = rows.map(r => ({
    ...r,
    author: authors.get(r.user_id) ?? null,
    ...(socialCounts.get(r.id) ?? { up_votes: 0, down_votes: 0, my_vote: null, comment_count: 0 }),
    blog_link: blogLinks.get(r.id) ?? null,
  }))

  return NextResponse.json({ ok: true, recommendations })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}

  const parsed = parseInput(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { count } = await supabase
    .from('recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= MAX_PER_USER) {
    return NextResponse.json({ error: `You've hit the ${MAX_PER_USER}-place cap` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('recommendations')
    .insert({
      user_id: user.id,
      category: parsed.category,
      place_name: parsed.place_name,
      iso2: parsed.iso2,
      town: parsed.town,
      google_maps_url: parsed.google_maps_url || null,
      date_visited: parsed.date_visited,
      rating: parsed.rating,
      note: parsed.note || null,
    })
    .select('id, user_id, category, place_name, iso2, town, google_maps_url, date_visited, rating, note, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const blogLink = (await getBlogLinksForRecommendations([data])).get(data.id) ?? null

  return NextResponse.json({
    ok: true,
    recommendation: {
      ...data,
      author: { id: user.id, username: null, full_name: null },
      up_votes: 0, down_votes: 0, my_vote: null, comment_count: 0,
      blog_link: blogLink,
    },
  })
}

// Owner edit, or an admin editing another admin's row — the "author
// fixes their own review" rule still holds for regular members, but
// the small admin team (currently just Bec + you) share the same
// bulk-imported/resolved data and need to fix each other's entries,
// not just their own. Admins still can't edit a regular member's row,
// only delete it (below) — editing someone else's words is different
// from removing them. An admin edit also reassigns user_id to
// themselves, so "posted by" reflects who the words belong to now.
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch {}
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const parsed = parseInput(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: existing } = await supabase.from('recommendations').select('user_id').eq('id', id).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = existing.user_id === user.id
  let editingAsAdmin = false
  if (!isOwner) {
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data: ownerAuth } = await adminClient().auth.admin.getUserById(existing.user_id)
    if (!isAdminEmail(ownerAuth.user?.email)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    editingAsAdmin = true
  }

  const client = editingAsAdmin ? adminClient() : supabase
  let query = client
    .from('recommendations')
    .update({
      // Reassigns authorship to the admin doing the editing — "posted
      // by" should reflect who the words on the page actually belong
      // to now, not just who happened to add the row originally.
      ...(editingAsAdmin ? { user_id: user.id } : {}),
      category: parsed.category,
      place_name: parsed.place_name,
      iso2: parsed.iso2,
      town: parsed.town,
      google_maps_url: parsed.google_maps_url || null,
      date_visited: parsed.date_visited,
      rating: parsed.rating,
      note: parsed.note || null,
    })
    .eq('id', id)
  if (!editingAsAdmin) query = query.eq('user_id', user.id)
  const { data, error } = await query
    .select('id, user_id, category, place_name, iso2, town, google_maps_url, date_visited, rating, note, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const blogLink = (await getBlogLinksForRecommendations([data])).get(data.id) ?? null
  // Only needs resolving on a reassignment — every other edit path
  // keeps the same author the card already has.
  const author = editingAsAdmin ? (await getPublicProfilesByIds([data.user_id])).get(data.user_id) ?? null : null

  return NextResponse.json({ ok: true, recommendation: { ...data, blog_link: blogLink, author } })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Admins can moderate any review — service role bypasses RLS, which
  // otherwise only lets a row's own author delete it.
  if (isAdminEmail(user.email)) {
    const { error } = await adminClient().from('recommendations').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('recommendations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
