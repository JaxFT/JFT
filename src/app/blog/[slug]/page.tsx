import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { format } from 'date-fns'
import { Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublishedPostBySlug, rowToView } from '@/lib/blog-db'

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const row = await getPublishedPostBySlug(slug)
  if (!row) return {}
  return { title: row.title, description: row.excerpt ?? undefined }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const row = await getPublishedPostBySlug(slug)
  if (!row) notFound()
  const post = rowToView(row)

  return (
    <div className="min-h-screen bg-white pt-20">
      {post.coverImage && (
        <div className="w-full h-72 sm:h-96 overflow-hidden">
          <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </Link>

        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map(tag => (
            <span key={tag} className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">{tag}</span>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 text-sm text-gray-400 mb-10 pb-8 border-b border-gray-100">
          <span>{post.author}</span>
          <span>·</span>
          <span>{format(new Date(post.date), 'MMMM d, yyyy')}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.readTime} min read</span>
        </div>

        <div className="prose-jft">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
