import Link from 'next/link'
import { PenLine, ArrowRight, ShieldCheck, FileText, Upload, MessageCircle, BookOpen, Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

const TOOLS = [
  {
    href: '/admin/blog/draft',
    title: 'New Post — Phone Wizard',
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
]

export default function AdminHomePage() {
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
