import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import WaystaqDiscountBanner from '@/components/WaystaqDiscountBanner'
import LiveHeartbeat from '@/components/LiveHeartbeat'
import SignupNudgeMounted from '@/components/SignupNudgeMounted'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'

export const metadata: Metadata = {
  title: { default: 'Jax Family Travels', template: '%s | Jax Family Travels' },
  description: 'Real family travel, honest guides, resources, and tools for families exploring the world.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'),
  // favicon.ico, icon.svg and apple-icon.png in src/app/ are picked up
  // automatically by the App Router. The manifest + 192/512 PNGs for
  // PWA-style installs live under /public/favicons/ and are wired in
  // explicitly below.
  manifest: '/favicons/site.webmanifest',
  // Explicit `icons` overrides Next.js's auto-detection of icon.svg /
  // apple-icon.png in src/app/, so we have to spell each one out
  // here, including the apple-touch-icon. Without it iOS Safari has
  // no icon to use when 'Add to Home Screen' is tapped and falls back
  // to drawing the first letter of the site name.
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  // Default link-preview image. Per-page metadata (e.g. blog posts
  // pulling their cover image) overrides this when set, so this only
  // fires for surfaces that don't define their own openGraph.images.
  // The path is resolved against metadataBase, so a full URL ends up
  // in the og:image tag.
  openGraph: {
    siteName: 'Jax Family Travels',
    type: 'website',
    images: [
      {
        url: '/images/homepage/homepage_header_jft.jpg',
        width: 1774,
        height: 887,
        alt: 'Jax Family Travels',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/images/homepage/homepage_header_jft.jpg'],
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
        <WaystaqDiscountBanner />
        <LiveHeartbeat disabled={isAdminEmail(user?.email)} />
        <SignupNudgeMounted initialIsSignedIn={!!user} />
      </body>
    </html>
  )
}
