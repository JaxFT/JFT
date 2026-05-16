import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import BlogCard from '@/components/blog/BlogCard'
import { ArrowRight, Map, BookOpen, Compass } from 'lucide-react'

export default function HomePage() {
  const posts = getAllPosts().slice(0, 3)

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80"
            alt="Aerial jungle"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-brand-800/60" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-800/85 via-brand-600/40 to-brand-300/20" />
        </div>

        {/* Decorative dots */}
        <div className="absolute top-32 left-12 grid grid-cols-5 gap-2 opacity-30 z-10">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
          ))}
        </div>
        <div className="absolute bottom-24 left-1/3 grid grid-cols-5 gap-2 opacity-20 z-10">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: headline */}
            <div>
              {/* Chevrons */}
              <div className="flex gap-1 text-brand-300 mb-6 text-xl font-bold tracking-widest">
                {'>>>>>>'}
              </div>
              <div className="w-1 h-20 bg-brand-400 inline-block mr-6 align-middle" />
              <h1 className="inline align-middle text-white font-black uppercase leading-none"
                  style={{ fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-0.02em' }}>
                <span className="block">EXPLORE</span>
                <span className="block text-brand-300">THE WORLD</span>
              </h1>
              <p className="text-white/70 text-lg leading-relaxed mt-6 max-w-md">
                Real family travel — no filters, no fluff. Practical guides, honest planning tools, and everything your family needs to explore the world together.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/i-want-to-travel" className="btn-primary text-base px-7 py-3.5">
                  I Want To Travel <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/blog" className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium transition-colors">
                  Read the blog <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="mt-4 flex gap-1 text-brand-300 text-xl font-bold tracking-widest">
                {'>>>>>>'}
              </div>
            </div>

            {/* Right: featured posts carousel */}
            {posts.length > 0 && (
              <div className="hidden lg:block">
                <div className="relative h-96">
                  {posts.slice(0, 3).map((post, i) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="absolute bg-white rounded-2xl overflow-hidden shadow-2xl w-56 transition-transform hover:scale-105 hover:z-30"
                      style={{
                        left:  `${i * 80}px`,
                        top:   `${i * 24}px`,
                        zIndex: 3 - i,
                        transform: `rotate(${[-3, 0, 3][i]}deg)`,
                      }}
                    >
                      {post.coverImage && (
                        <img src={post.coverImage} alt={post.title} className="w-full h-36 object-cover" />
                      )}
                      <div className="p-3">
                        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{post.title}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                          Read More <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── WHAT WE OFFER ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">What we offer</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Built for families who actually travel</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Compass, title: 'I Want To Travel', desc: 'Our decision tool that tells you honestly if long-term family travel is realistic for you right now.', href: '/i-want-to-travel', badge: 'Premium' },
              { icon: Map, title: 'Guides', desc: 'Destination guides written from real family experience — what actually worked, what didn\'t.', href: '/guides', badge: null },
              { icon: BookOpen, title: 'Learning Packs', desc: 'Practical resources for travelling families — from schooling on the road to managing money abroad.', href: '/learning', badge: 'Premium' },
            ].map(item => (
              <Link key={item.href} href={item.href} className="group relative bg-sand-50 rounded-2xl p-7 hover:bg-brand-50 transition-colors border border-sand-200 hover:border-brand-200">
                {item.badge && (
                  <span className="absolute top-4 right-4 text-xs font-semibold bg-brand-600 text-white px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
                <div className="w-11 h-11 bg-brand-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-700 transition-colors">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── LATEST BLOG POSTS ── */}
      {posts.length > 0 && (
        <section className="py-20 bg-sand-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">From the blog</p>
                <h2 className="text-3xl font-bold text-gray-900">Latest stories</h2>
              </div>
              <Link href="/blog" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                All posts <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link href="/blog" className="btn-outline">All posts</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── PREMIUM CTA ── */}
      <section className="py-20 bg-brand-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-4">Premium membership</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything, for £25 a year</h2>
          <p className="text-white/70 text-lg mb-8 leading-relaxed">
            Get full access to every guide, learning pack, and travel tool — including I Want To Travel. Cancel any time.
          </p>
          <Link href="/signup" className="btn-primary text-base px-8 py-3.5">
            Get started <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-4 text-sm text-white/40">Or buy individual guides separately.</p>
        </div>
      </section>
    </>
  )
}
