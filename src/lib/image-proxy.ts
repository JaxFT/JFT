// Rewrites Supabase Storage public URLs to go through our /img/[…]
// edge-cached worker route. First request fetches from Supabase, every
// subsequent request is served from Cloudflare's edge — kills the
// 5GB/month Supabase bandwidth bottleneck without touching stored data.
//
// Pass any URL through this helper. Non-Supabase URLs and falsy values
// come back untouched, so it's safe to wrap blindly at render sites.
//
// Both client and server-safe (no env-only imports beyond NEXT_PUBLIC_*).

const SUPABASE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const STORAGE_PREFIX = '/storage/v1/object/public/'

export function proxyImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (!SUPABASE_BASE) return url
  const fullPrefix = SUPABASE_BASE + STORAGE_PREFIX
  if (!url.startsWith(fullPrefix)) return url
  const rest = url.slice(fullPrefix.length)
  // Drop any query/hash on signed URLs — public objects don't need them
  // and they'd defeat edge cache hits for the same object.
  const cleanPath = rest.split(/[?#]/)[0]
  return `/img/${cleanPath}`
}
