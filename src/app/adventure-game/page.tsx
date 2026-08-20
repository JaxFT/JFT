import type { Metadata } from 'next'
import { Rocket } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { COUNTRIES } from '@/lib/game/countries'
import type { GameProgress } from '@/lib/game/types'
import AdventureGameClient from './AdventureGameClient'

export const metadata: Metadata = {
  title: 'Adventure Game — Get the Family There!',
  description: 'A free, one-thumb mobile game. Fire travellers through multiplier gates, dodge obstacles, and get as many of them to the destination as you can. No download, no account required.',
}

export const dynamic = 'force-dynamic'

export default async function AdventureGamePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let serverProgress: GameProgress | null = null
  if (user) {
    const { data } = await supabase
      .from('game_progress')
      .select('country_slug, best_score, unlocked, passport_stamp')
      .eq('user_id', user.id)

    if (data) {
      serverProgress = {}
      const slugs = new Set(COUNTRIES.map(c => c.slug))
      for (const row of data) {
        if (!slugs.has(row.country_slug)) continue
        serverProgress[row.country_slug] = {
          bestScore: row.best_score,
          unlocked: row.unlocked,
          passportStamp: row.passport_stamp,
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-sand-50 pt-20 sm:pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 inline-flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5" /> Adventure Game
          </p>
        </div>
        <AdventureGameClient serverProgress={serverProgress} isLoggedIn={Boolean(user)} />
      </div>
    </div>
  )
}
