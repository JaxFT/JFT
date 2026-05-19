'use client'

// Kid-mode wrapper around PackShell. Forwards the kid hook so the same
// shell UI works without RLS, using the qr_token in the URL.

import { useKidAdventurePack } from '@/hooks/useKidAdventurePack'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import PackShell from './PackShell'

export default function KidPackShell({
  token,
  data,
}: {
  token: string
  data: AdventurePackData
}) {
  const pack = useKidAdventurePack(token, data.slug)
  return (
    <PackShell
      pack={pack}
      data={data}
      backHref={`/kid/${token}`}
      backLabel="Back to my passport"
    />
  )
}
