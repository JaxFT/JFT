'use client'

// Free taster shell for anonymous visitors. Same PackShell UI as the
// signed-in flow but:
//   - state persists to localStorage instead of the DB
//   - only a curated subset of missions is interactive (the rest show
//     a locked sign-up / Premium upsell card in PackShell)
// Used by the free France pack so a first-touch visitor can sample
// the product without signing up.

import { useAnonymousAdventurePack } from '@/hooks/useAnonymousAdventurePack'
import type { AdventurePackData, SectionKey } from '@/lib/adventurePackTypes'
import PackShell from './PackShell'

// Missions an anonymous visitor can fully use. Picked for spread —
// one geographic ("where is this country?"), one interactive ("try a
// phrase out loud") — so the taster shows the breadth of the pack.
const ANON_FREE_SECTIONS: SectionKey[] = ['map', 'language']

export default function AnonymousPackShell({
  data,
}: {
  data: AdventurePackData
}) {
  const pack = useAnonymousAdventurePack(data.slug)
  return <PackShell pack={pack} data={data} freeSections={ANON_FREE_SECTIONS} />
}
