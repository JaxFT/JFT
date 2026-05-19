'use client'

// Kid-mode wrapper around PackShell. Forwards the kid hook so the same
// shell UI works without RLS, using the qr_token in the URL. Also
// renders a stamp-celebration overlay when the hook reports a fresh
// stamp earned this session.

import { useKidAdventurePack } from '@/hooks/useKidAdventurePack'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import PackShell from './PackShell'
import StampCelebration from '@/components/passport/StampCelebration'

export default function KidPackShell({
  token,
  data,
}: {
  token: string
  data: AdventurePackData
}) {
  const pack = useKidAdventurePack(token, data.slug)
  // Show one celebration at a time. dismissStamp pops the head of the
  // queue so multi-stamp moments (e.g. a single section completion
  // that mints both BRAVE_EATER and MAP_READER) play in sequence.
  const next = pack.newStamps[0] ?? null

  return (
    <>
      <PackShell
        pack={pack}
        data={data}
        backHref={`/kid/${token}`}
        backLabel="Back to my passport"
      />
      <StampCelebration stamp={next} onDismiss={pack.dismissStamp} />
    </>
  )
}
