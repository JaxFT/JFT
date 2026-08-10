import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import QuizClient from './QuizClient'

// Admin-only while the quiz is still being built out, live on prod at
// its real URL so it can be reviewed and iterated on without a separate
// staging step. 404s for everyone else. Remove this gate (and the
// noindex below) once the questions/results are signed off, that's the
// whole launch.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'What Kind of Traveller Are You?',
  robots: { index: false, follow: false },
}

export default async function TravellerQuizPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 to-white pt-28 pb-24 px-4">
      <QuizClient />
    </div>
  )
}
