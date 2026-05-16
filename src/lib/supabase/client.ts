import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    {
      auth: {
        // Implicit flow puts the access/refresh tokens straight in the URL
        // fragment after Supabase verifies the email link. No PKCE verifier
        // is needed on the client → email links work even when opened in a
        // different browser/device than the one that initiated the flow
        // (e.g. clicking a reset link from your phone's mail app when the
        // request was made on your laptop).
        flowType: 'implicit',
        detectSessionInUrl: true,
      },
    },
  )
}
