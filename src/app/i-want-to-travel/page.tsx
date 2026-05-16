import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'I Want To Travel' }

export default async function IWantToTravelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check subscription tier
  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
    isPremium = profile?.subscription_tier === 'premium'
  }

  if (!user) redirect('/login?next=/i-want-to-travel')

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-sand-50 pt-24 pb-20 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-6 h-6 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Premium content</h1>
          <p className="text-gray-500 mb-6 leading-relaxed">
            <strong>I Want To Travel</strong> is included in Premium membership (£25/year) or available as a one-off purchase.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/account" className="btn-primary justify-center">
              Upgrade to Premium <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/guides" className="btn-outline justify-center">
              Browse individual guides
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Premium user — show the tool
  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Decision tool</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">I Want To Travel</h1>
        <p className="text-gray-500 mb-10">Answer a few honest questions and we'll tell you if long-term family travel is realistic for you right now.</p>

        {/* The Family Way questionnaire will be embedded here */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <p className="font-medium">Questionnaire coming soon — check back shortly.</p>
        </div>
      </div>
    </div>
  )
}
