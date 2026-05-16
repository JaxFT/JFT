import { createClient } from '@/lib/supabase/server'

export type BlogPostStatus = 'draft' | 'published'

export type BlogPostRow = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body_markdown: string
  cover_image: string | null
  tags: string[]
  author: string
  status: BlogPostStatus
  published_at: string | null
  created_at: string
  updated_at: string
}

export async function listPublishedPosts(): Promise<BlogPostRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return (data ?? []) as BlogPostRow[]
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPostRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  return (data ?? null) as BlogPostRow | null
}

export async function listAllPostsForAdmin(): Promise<BlogPostRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .order('updated_at', { ascending: false })
  return (data ?? []) as BlogPostRow[]
}

export async function getPostById(id: string): Promise<BlogPostRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data ?? null) as BlogPostRow | null
}

function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export type BlogPostView = {
  slug: string
  title: string
  excerpt: string
  date: string
  author: string
  coverImage: string
  tags: string[]
  content: string
  readTime: number
}

export function rowToView(row: BlogPostRow): BlogPostView {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? '',
    date: row.published_at ?? row.created_at,
    author: row.author,
    coverImage: row.cover_image ?? '',
    tags: row.tags,
    content: row.body_markdown,
    readTime: readingTime(row.body_markdown),
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || `post-${Date.now()}`
}
