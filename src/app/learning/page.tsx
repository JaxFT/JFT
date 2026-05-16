import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Lock, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Learning Packs' }

export default async function LearningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    isPremium = profile?.subscription_tier === 'premium'
  }

  if (!user) redirect('/login?next=/learning')

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-sand-50 pt-24 pb-20 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-6 h-6 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Premium content</h1>
          <p className="text-gray-500 mb-6 leading-relaxed">
            Learning packs are included in Premium membership (£25/year).
          </p>
          <Link href="/account" className="btn-primary justify-center">
            Upgrade to Premium <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Members</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Learning Packs</h1>
        <p className="text-gray-500 mb-10">Practical resources for families on the road — written by Bec.</p>

        {/* Packs will live here once Bec's content is ready */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-brand-200" />
          <p className="font-medium">Learning packs coming soon.</p>
          <p className="text-sm mt-1">Bec is putting the finishing touches on the first pack — you'll be notified when it's live.</p>
        </div>
      </div>
    </div>
  )
}
