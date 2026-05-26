'use client'

// Thin client wrapper that picks the right SignupNudge variant for
// the current path. Mounted once in the root layout so a signed-out
// visitor sees a single nudge per surface category (generic OR blog).

import { usePathname } from 'next/navigation'
import SignupNudge from './SignupNudge'

// Surfaces where a signup nudge would be the wrong thing to show:
// the user is mid-flow (login/signup/auth callback), the page is a
// kid-facing passport view (anonymous-by-design), or admin internals.
const EXCLUDED_PATTERNS: RegExp[] = [
  /^\/login(\/|$)/,
  /^\/signup(\/|$)/,
  /^\/auth\//,
  /^\/admin(\/|$)/,
  /^\/kid\//,
]

export default function SignupNudgeMounted({ initialIsSignedIn }: { initialIsSignedIn: boolean }) {
  const pathname = usePathname() ?? '/'

  if (initialIsSignedIn) return null
  if (EXCLUDED_PATTERNS.some(rx => rx.test(pathname))) return null

  // Blog post pages (/blog/<slug>, not the /blog index) get the
  // blog-specific copy. Everything else gets the generic version.
  const isBlogPost = /^\/blog\/[^/]+/.test(pathname)

  return (
    <SignupNudge
      variant={isBlogPost ? 'blog' : 'generic'}
      initialIsSignedIn={initialIsSignedIn}
    />
  )
}
