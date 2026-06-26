'use server'

import { createClient as createSbClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function db() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createSbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

function n(v: string | undefined): number | null {
  if (!v?.trim()) return null
  const x = Number(v)
  return isNaN(x) ? null : x
}

function s(v: string | undefined): string | null {
  return v?.trim() || null
}

function buildRow(f: Record<string, string>) {
  return {
    name:                     f.name.trim(),
    post_type:                f.post_type,
    posted_date:              s(f.posted_date),
    instagram_url:            s(f.instagram_url),
    duration_seconds:         n(f.duration_seconds),
    clip_count:               n(f.clip_count),
    audio_type:               s(f.audio_type),
    topic:                    s(f.topic),
    visual_hook:              s(f.visual_hook),
    verbal_hook:              s(f.verbal_hook),
    text_hook:                s(f.text_hook),
    hook_duration_seconds:    n(f.hook_duration_seconds),
    views:                    n(f.views),
    reach:                    n(f.reach),
    plays:                    n(f.plays),
    likes:                    n(f.likes),
    comments:                 n(f.comments),
    shares:                   n(f.shares),
    saves:                    n(f.saves),
    follows_gained:           n(f.follows_gained),
    avg_watch_time_seconds:   n(f.avg_watch_time_seconds),
    watch_through_rate_pct:   n(f.watch_through_rate_pct),
    profile_visits:           n(f.profile_visits),
    non_follower_views:       n(f.non_follower_views),
    non_follower_watch_pct:   n(f.non_follower_watch_pct),
    notes:                    s(f.notes),
  }
}

export async function createReel(f: Record<string, string>) {
  const { data, error } = await db().from('reels').insert([buildRow(f)]).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/admin/reels')
  return data
}

export async function updateReel(id: string, f: Record<string, string>) {
  const { data, error } = await db().from('reels').update(buildRow(f)).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/admin/reels')
  return data
}

export async function deleteReel(id: string) {
  const { error } = await db().from('reels').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/reels')
}
