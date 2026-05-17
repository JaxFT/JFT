import { createClient } from '@/lib/supabase/server'

export type GuideRow = {
  id: string
  slug: string
  name: string
  subtitle: string | null
  description: string | null
  price_pence: number
  cover_image: string | null
  preview_path: string | null
  full_path: string | null
  preview_page_count: number
  tags: string[]
  active: boolean
}

export async function listActiveGuides(): Promise<GuideRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id, slug, name, subtitle, description, price_pence, cover_image, preview_path, full_path, preview_page_count, tags, active')
    .eq('type', 'guide')
    .eq('active', true)
    .order('name', { ascending: true })
  return (data ?? []) as GuideRow[]
}

// Admin view: all PDF guides regardless of active flag so admin can
// toggle them on/off without going into Supabase.
export async function listAllLegacyGuidesForAdmin(): Promise<GuideRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id, slug, name, subtitle, description, price_pence, cover_image, preview_path, full_path, preview_page_count, tags, active')
    .eq('type', 'guide')
    .order('name', { ascending: true })
  return (data ?? []) as GuideRow[]
}

export async function getGuideBySlug(slug: string): Promise<GuideRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id, slug, name, subtitle, description, price_pence, cover_image, preview_path, full_path, preview_page_count, tags, active')
    .eq('type', 'guide')
    .eq('slug', slug)
    .maybeSingle()
  return (data ?? null) as GuideRow | null
}

export async function userHasPurchased(userId: string, productId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle()
  return !!data
}

export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

// Bucket names — must match what's set up in Supabase Storage.
export const PREVIEWS_BUCKET = 'guide-previews'
export const FULL_BUCKET = 'guide-files'
