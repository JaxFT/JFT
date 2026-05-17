import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: { default: 'Jax Family Travels', template: '%s | Jax Family Travels' },
  description: 'Real family travel — honest guides, resources, and tools for families exploring the world.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'),
  openGraph: {
    siteName: 'Jax Family Travels',
    type: 'website',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve the user server-side and hand it to the Navbar so it doesn't
  // need to re-fetch on the client. The first render of every page now
  // shows the right logged-in/logged-out state without flicker.
  // Cached via React.cache so pages that also call getCurrentUser share
  // the same single auth.getUser round-trip.
  const user = await getCurrentUser()
  return (
    <html lang="en">
      <body>
        <Navbar
          initialUserId={user?.id ?? null}
          initialUserEmail={user?.email ?? null}
        />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
