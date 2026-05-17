import Link from 'next/link'
import { ArrowRight, Clock, Crown } from 'lucide-react'
import { format } from 'date-fns'
import type { BlogPost } from '@/types'

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      {post.coverImage && (
        <div className="overflow-hidden h-48">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ objectPosition: `${post.coverFocalX ?? 50}% ${post.coverFocalY ?? 50}%` }}
          />
        </div>
      )}
      <div className="flex flex-col flex-1 p-5">
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-3">{post.excerpt}</p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{post.readTime} min read</span>
            <span className="mx-1.5">·</span>
            <span>{format(new Date(post.date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            {post.isPremium && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3" /> Premium
              </span>
            )}
            <ArrowRight className="w-4 h-4 text-brand-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  )
}
