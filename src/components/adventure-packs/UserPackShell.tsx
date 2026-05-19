'use client'

// Thin wrapper that constructs the user-mode useAdventurePack hook
// and forwards it to the pure PackShell UI. Keeps the existing
// /adventure-packs/{slug} flow working unchanged while letting kid
// mode reuse the same shell with a different data source.

import { useAdventurePack } from '@/hooks/useAdventurePack'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import PackShell from './PackShell'

export default function UserPackShell({
  userId,
  data,
}: {
  userId: string
  data: AdventurePackData
}) {
  const pack = useAdventurePack(userId, data.slug)
  return <PackShell pack={pack} data={data} />
}
