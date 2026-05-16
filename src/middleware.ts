import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...(options ?? {}) }),
          )
        },
      },
    },
  )

  // Refresh session if expiring — this is what keeps the user logged in across navigations.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Run on every page route, but skip Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?|ttf|otf|css|js)$).*)',
  ],
}
