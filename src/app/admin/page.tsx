import Link from 'next/link'
import { PenLine, ArrowRight, ShieldCheck, ShieldAlert, FileText, Upload, MessageCircle, BookOpen, Users, Sparkles, Video, Ticket, Gift, Compass, Link2, MapPin, Star, BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

const TOOLS = [
  {
    href: '/admin/blog/draft',
    title: 'New Post, Phone Wizard',
    desc: 'The mobile-first flow: answer a few questions, add photos, copy the prompt into Claude.ai or ChatGPT, paste the response back. No API credit needed.',
    icon: PenLine,
  },
  {
    href: '/admin/blog',
    title: 'All Posts',
    desc: 'Edit, publish, and unpublish blog posts. Your drafts and published posts in one place.',
    icon: FileText,
  },
  {
    href: '/admin/blog/import',
    title: 'Paste markdown directly',
    desc: 'Already have markdown ready (from anywhere)? Paste it here to create a draft in one step.',
    icon: Upload,
  },
  {
    href: '/admin/guides',
    title: 'Web Guides',
    desc: 'Long-form destination guides rendered as web pages. Multi-step wizard with one prompt per section, save as you go.',
    icon: BookOpen,
  },
  {
    href: '/admin/settings/about-us',
    title: 'About Us text',
    desc: 'The shared About Us text that appears on every web guide. Update once, changes everywhere.',
    icon: Users,
  },
  {
    href: '/admin/call-requests',
    title: '1:1 Call Requests',
    desc: 'People asking to book a call. Review their details, email them back with availability and pricing, track status.',
    icon: MessageCircle,
  },
  {
    href: '/ai-travel-prompts',
    title: 'AI Prompt Builder',
    desc: 'The live AI travel prompt builder: pick a prompt, answer a few questions, copy an engineered prompt for your own AI. Also linked in the main nav for everyone.',
    icon: Sparkles,
  },
  {
    href: '/admin/reels',
    title: 'Reel Analytics',
    desc: 'Log every Instagram reel with hooks, content details, and performance metrics. Export to CSV and ask your AI what to make next.',
    icon: Video,
  },
  {
    href: '/what-kind-of-traveller-are-you',
    title: 'Traveller Type Quiz',
    desc: "Six-question shareable quiz, live at its own URL (noindex, not linked from nav yet) and reachable from the Travel Profile editor's \"Take the quiz\" CTA. Links each result back to real posts and guides.",
    icon: Compass,
  },
  {
    href: '/admin/discount-codes',
    title: 'Discount Codes',
    desc: 'Create percent-off codes with a usage cap, scoped to Premium, guides, and/or Adventure Packs. Tracks redemptions automatically.',
    icon: Ticket,
  },
  {
    href: '/admin/recommendations-stats',
    title: 'Recommendations stats',
    desc: 'Votes, comments, country coverage and Maps-link gaps across the Recommendations directory, plus a link out to Cloudflare Web Analytics for page views.',
    icon: BarChart3,
  },
  {
    href: '/admin/gift-premium',
    title: 'Gift Premium',
    desc: "Give an existing member a year of Premium access for free, no Stripe charge. Auto-expires after a year unless they subscribe for real.",
    icon: Gift,
  },
  {
    href: '/admin/campaigns',
    title: 'Campaign Links',
    desc: 'Create trackable short links for guide promos (Instagram DMs, etc.) and see the full funnel: clicked, viewed, clicked buy, purchased.',
    icon: Link2,
  },
  {
    href: '/admin/moderation',
    title: 'Moderation',
    desc: 'Every new blog comment, recommendation comment, and guestbook message, plus anything a page owner has flagged. Mark reviewed to clear it.',
    icon: ShieldAlert,
  },
  {
    href: '/admin/resolve-maps-links',
    title: 'Resolve Maps links',
    desc: 'Bulk-attach Google Maps links to your own recommendations that don’t have one yet, auto-searched and throttled, one click per match.',
    icon: MapPin,
  },
  {
    href: '/admin/write-reviews',
    title: 'Write Google reviews',
    desc: 'Your own recommendations with a Maps link, one click through to that place’s Google review box, copy your note first, mark done as you go.',
    icon: Star,
  },
]

export default async function AdminHomePage() {
  await requireAdminPage()
  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600">Admin</p>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin tools</h1>
        <p className="text-gray-500 mb-10 text-lg max-w-xl">Internal tools for managing JFT content. Not visible to regular members.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TOOLS.map(tool => (
            <Link key={tool.href} href={tool.href} className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-brand-300 hover:shadow-md transition-all">
              <div className="w-11 h-11 bg-brand-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-700 transition-colors">
                <tool.icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-bold text-gray-900 mb-1.5">{tool.title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-3">{tool.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">
                Open <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
