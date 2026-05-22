import Link from 'next/link'
import { listHomepageFeaturedPosts, rowToView } from '@/lib/blog-db'
import { loadCountsForSlugs } from '@/lib/blog-social-db'
import BlogCard from '@/components/blog/BlogCard'
import HeroBlogStack from '@/components/blog/HeroBlogStack'
import { createClient } from '@/lib/supabase/server'
import { ArrowRight, Map, BookOpen, Compass, Crown, Sparkles } from 'lucide-react'
import { isPremiumTier } from '@/lib/profile'
import UpgradeButton from '@/components/billing/UpgradeButton'
import WaystaqCard from '@/components/WaystaqCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  description: 'Long-term family travel without the filters. Real guides, honest readiness tools, and missions to do with your kids on the road. From a British family doing it for real.',
}

export default async function HomePage() {
  // Kick off the public data fetch and the cookie-aware client construction
  // in parallel, they're independent.
  const [rows, supabase] = await Promise.all([
    listHomepageFeaturedPosts(),
    createClient(),
  ])
  const posts = rows.map(rowToView)
  const counts = await loadCountsForSlugs(posts.map(p => p.slug))

  const { data: { user } } = await supabase.auth.getUser()
  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    isPremium = isPremiumTier(profile?.subscription_tier)
  }

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/homepage/homepage_header_jft.jpg"
            alt="The Jax Family Travels family on the road"
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover object-center"
          />
          {/* Lighter overlay than before, let the photo speak, just enough dark to keep the white headline readable */}
          <div className="absolute inset-0 bg-brand-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/70 via-brand-950/30 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: headline */}
            <div>
              <div className="w-1 h-20 bg-brand-400 inline-block mr-6 align-middle" />
              <h1 className="inline align-middle text-white font-black uppercase leading-none"
                  style={{ fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '-0.02em' }}>
                <span className="block">EXPLORE</span>
                <span className="block text-brand-300">THE WORLD</span>
              </h1>
              <p className="text-white/85 text-lg leading-relaxed mt-6 max-w-md">
                Real family travel without filters or overcomplication. Practical guidance, honest planning tools, and real experience to help your family save, plan, and make long-term travel possible in a realistic way. Clear steps, real costs, and what we actually did so you can figure out how to do it for your own family.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/work-with-us" className="btn-primary text-base px-7 py-3.5">
                  How we can help <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/blog" className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium transition-colors">
                  Read the blog <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right: featured posts stack, draggable on desktop, swipe to flip between pinned homepage posts */}
            {posts.length > 0 && (
              <div className="hidden lg:block">
                <HeroBlogStack posts={posts.slice(0, 3)} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── WHAT WE OFFER ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 max-w-3xl mx-auto leading-tight mb-6">
              Helping families travel longer, smarter and more confidently
            </h2>
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600">What we offer</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Compass, title: 'I Want To Travel', desc: 'Our decision tool that tells you honestly if long-term family travel is realistic for you right now.', href: '/i-want-to-travel', premiumFeature: false },
              { icon: Map, title: 'Guides', desc: 'Destination guides written from real family experience, what actually worked, what didn\'t.', href: '/guides', premiumFeature: false },
              { icon: BookOpen, title: 'Adventure Packs', desc: 'Country-specific missions for your family, language, food, geography, scavenger hunts and family chat cards.', href: '/adventure-packs', premiumFeature: true },
            ].map(item => {
              const showBadge = item.premiumFeature
              const badgeText = isPremium ? 'Included' : 'Premium'
              return (
                <a key={item.href} href={item.href} className="group relative bg-sand-50 rounded-2xl p-7 hover:bg-brand-50 transition-colors border border-sand-200 hover:border-brand-200">
                  {showBadge && (
                    <span className={`absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isPremium ? 'bg-brand-100 text-brand-800' : 'bg-brand-600 text-white'
                    }`}>
                      {isPremium && <Crown className="w-3 h-3" />}
                      {badgeText}
                    </span>
                  )}
                  <div className="w-11 h-11 bg-brand-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-700 transition-colors">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </a>
              )
            })}
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
                <h2 className="text-3xl font-bold text-gray-900">Featured stories</h2>
              </div>
              <Link href="/blog" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                All posts <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                <BlogCard key={post.slug} post={post} counts={counts[post.slug]} />
              ))}
            </div>
            <div className="text-center mt-8 sm:hidden">
              <Link href="/blog" className="btn-outline">All posts</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── PREMIUM CTA, varies by auth/tier ── */}
      <section className="py-20 bg-brand-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          {isPremium ? (
            <>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-4 inline-flex items-center gap-1.5 justify-center">
                <Sparkles className="w-3.5 h-3.5" /> Your membership
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">You have access to everything</h2>
              <p className="text-white/70 text-lg mb-8 leading-relaxed">
                Every premium blog post, every guide, and every adventure pack are open to you. Here are a few places to start.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/guides" className="btn-primary text-base px-7 py-3.5">
                  Browse guides <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/i-want-to-travel" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-base font-semibold transition-colors">
                  I Want To Travel <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-4">Premium membership</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything, for £49.99 a year</h2>
              <p className="text-white/70 text-lg mb-8 leading-relaxed">
                A year of access to every premium blog post, every guide, and every adventure pack. Cancel any time.
              </p>
              {user ? (
                <UpgradeButton className="btn-primary text-base px-8 py-3.5" />
              ) : (
                <Link href="/signup" className="btn-primary text-base px-8 py-3.5">
                  Get started <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <p className="mt-4 text-sm text-white/40">Or buy individual guides separately.</p>
            </>
          )}
        </div>
      </section>

      {/* Waystaq cross-promo — bold hero variant for the homepage so
          it actually catches a visitor's eye. Brand-styled (Waystaq
          gradient + colours, not JFT's), real logo. */}
      <WaystaqCard variant="hero" />
    </>
  )
}
