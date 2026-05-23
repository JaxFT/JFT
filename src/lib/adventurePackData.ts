// Pack content loader.
//
// Each pack lives as its own JSON file under public/data/packs/. In
// production on Cloudflare Workers, we read it via the ASSETS service
// binding (the documented way), because plain fetch() from a worker to
// its own zone hits the worker again and 404s. In local dev we just
// HTTP fetch the file from the Next.js dev server.
//
// Previously the data was all inline in this file (1.13 MB / 11k lines).

import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { AdventurePackData } from './adventurePackTypes'

type AssetsBinding = { fetch: (req: Request) => Promise<Response> }

async function fetchFromAssets(path: string): Promise<AdventurePackData | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const ASSETS = (env as { ASSETS?: AssetsBinding }).ASSETS
    if (!ASSETS) return null
    const res = await ASSETS.fetch(new Request(`https://placeholder${path}`))
    if (!res.ok) return null
    return (await res.json()) as AdventurePackData
  } catch {
    // Not in Cloudflare runtime (local dev, test, etc.).
    return null
  }
}

async function fetchFromHttp(path: string): Promise<AdventurePackData | null> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${siteUrl}${path}`)
    if (!res.ok) return null
    return (await res.json()) as AdventurePackData
  } catch {
    return null
  }
}

export async function getPackData(slug: string): Promise<AdventurePackData | null> {
  const path = `/data/packs/${encodeURIComponent(slug)}.json`
  const fromAssets = await fetchFromAssets(path)
  if (fromAssets) return fromAssets
  return fetchFromHttp(path)
}

// Re-export so existing `import { getPackMeta } from '@/lib/adventurePackData'`
// callers don't need to change their imports.
export { getPackMeta } from './adventurePackMeta'
