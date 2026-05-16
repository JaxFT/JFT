import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: { default: 'Jax Family Travels', template: '%s | Jax Family Travels' },
  description: 'Real family travel — honest guides, resources, and tools for families exploring the world.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'),
  openGraph: {
    siteName: 'Jax Family Travels',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
