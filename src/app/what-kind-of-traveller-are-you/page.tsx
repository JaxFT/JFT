import type { Metadata } from 'next'
import QuizClient from './QuizClient'

// Live at its real URL, reachable by anyone with the link (the Travel
// Profile editor's "Take the quiz" CTA points here) but not yet linked
// from anywhere discoverable (nav, sitemap) or indexed by search, so
// noindex stays on until it's ready for a proper public launch.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'What Kind of Traveller Are You?',
  robots: { index: false, follow: false },
}

export default function TravellerQuizPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 to-white pt-28 pb-24 px-4">
      <QuizClient />
    </div>
  )
}
