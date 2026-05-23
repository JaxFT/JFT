// Dynamic per-pack OG image. Renders a 1200x630 PNG with the country
// flag emoji, country name, pack subtitle, and JFT branding. Next.js
// picks this up automatically and points <meta property="og:image">
// at /adventure-packs/<slug>/opengraph-image for every pack page.
//
// Pack URLs shared on WhatsApp, Twitter/X, iMessage, Slack now show a
// country-specific preview instead of the generic site OG image.

import { ImageResponse } from 'next/og'
import { getPackMeta } from '@/lib/adventurePackMeta'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// Next will request this image once per pack and Cloudflare caches the
// PNG at the edge thereafter, so the runtime cost is one render per
// pack per deploy.
export const dynamic = 'force-static'

export default async function PackOgImage({
  params,
}: {
  params: { slug: string }
}) {
  const meta = getPackMeta(params.slug)
  if (!meta) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#2d6b4f',
            color: 'white',
            fontSize: 64,
          }}
        >
          Jax Family Travels
        </div>
      ),
      size,
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #2d6b4f 0%, #1e40af 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          padding: 80,
        }}
      >
        {/* Flag emoji as the central motif */}
        <div style={{ fontSize: 280, lineHeight: 1, marginBottom: 24 }}>
          {meta.flag}
        </div>

        {/* Country name */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {meta.country}
        </div>

        {/* Adventure Pack subtitle */}
        <div
          style={{
            fontSize: 40,
            marginTop: 20,
            opacity: 0.92,
            fontWeight: 500,
          }}
        >
          Adventure Pack
        </div>

        {/* JFT brand bar at the bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            fontSize: 22,
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: '0.32em',
            fontWeight: 600,
          }}
        >
          Jax  |  Family Travels
        </div>
      </div>
    ),
    size,
  )
}
