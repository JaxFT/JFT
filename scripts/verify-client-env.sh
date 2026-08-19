#!/bin/sh
# Guards against the exact bug fixed in commit 967d8d6: wrangler deploy
# on this OpenNext project silently re-triggers its own internal
# opennextjs-cloudflare rebuild, and if that rebuild ever runs without
# .env.local loaded again (e.g. a future wrangler/opennextjs-cloudflare
# upgrade changes how it delegates), NEXT_PUBLIC_ vars silently vanish
# from the deployed client bundle with no error, only a live-site
# regression discovered after the fact. Run right after `wrangler
# deploy` so it checks the assets that actually got uploaded.
#
# Checks the two known client-side NEXT_PUBLIC_ consumers (see
# src/lib/supabase/client.ts and src/lib/google-places.ts). Add a line
# here for any new NEXT_PUBLIC_ var a 'use client' component reads.

set -e
ASSETS=.open-next/assets/_next/static/chunks

fail=0

if grep -rq "placeholder.supabase.co" "$ASSETS" 2>/dev/null; then
  echo "DEPLOY BROKEN: placeholder.supabase.co baked into the client bundle — NEXT_PUBLIC_SUPABASE_URL was empty during this build." >&2
  fail=1
fi

if [ -n "$NEXT_PUBLIC_GOOGLE_PLACES_API_KEY" ] && ! grep -rq "$NEXT_PUBLIC_GOOGLE_PLACES_API_KEY" "$ASSETS" 2>/dev/null; then
  echo "DEPLOY BROKEN: NEXT_PUBLIC_GOOGLE_PLACES_API_KEY is missing from the client bundle." >&2
  fail=1
fi

if [ "$fail" = "1" ]; then
  echo "The deployed site is live with a broken client bundle. See commit 967d8d6 for the known cause (wrangler's internal rebuild running outside the dotenv-loaded env)." >&2
  exit 1
fi

echo "verify-client-env: NEXT_PUBLIC_ vars present in the deployed client bundle."
