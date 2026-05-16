import type { Metadata } from 'next'
import { Map, ArrowRight, Lock } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Guides' }

// Guides will be pulled from Supabase products table — static placeholders for now
const GUIDES = [
  {
    slug: 'penang-trip-planner',
    title: 'Penang Complete Trip Planner',
    desc: 'A practical end-to-end planning guide for visiting Penang with kids — itineraries, where to stay by neighbourhood, food markets, and family logistics.',
    price: '£4.99',
    tags: ['Asia', 'Malaysia', 'Planner'],
    free: false,
  },
  {
    slug: 'slow-travel-portugal',
    title: 'Slow Travel Portugal with Kids',
    desc: 'A month-by-month guide to settling into Portugal as a travelling family.',
    price: '£4.99',
    tags: ['Europe', 'Portugal'],
    free: false,
  },
  {
    slug: 'getting-started',
    title: 'Getting Started: Your First Family Trip Abroad',
    desc: 'The basics — passports, insurance, packing, and mindset. Free for all members.',
    price: 'Free',
    tags: ['Beginner', 'Planning'],
    free: true,
  },
]

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Resources</p>
          <h1 className="text-4xl font-bold text-gray-900">Guides</h1>
          <p className="text-gray-500 mt-2 text-lg max-w-xl">Practical destination and planning guides written from real family travel experience. Buy individually or get everything with Premium.</p>
        </div>

        {/* Premium banner */}
        <div className="bg-brand-950 text-white rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg">Get every guide for £25/year</p>
            <p className="text-white/60 text-sm">Premium membership includes all guides, the travel tool, and learning packs.</p>
          </div>
          <Link href="/signup" className="btn-primary shrink-0">
            Go Premium <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GUIDES.map(guide => (
            <div key={guide.slug} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="h-40 bg-brand-600/10 flex items-center justify-center">
                <Map className="w-12 h-12 text-brand-300" />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {guide.tags.map(tag => (
                    <span key={tag} className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{guide.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">{guide.desc}</p>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                  <span className="font-bold text-gray-900">{guide.price}</span>
                  <button className="btn-primary !py-2 !px-4 !text-sm">
                    {guide.free ? 'Read free' : 'Buy guide'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
