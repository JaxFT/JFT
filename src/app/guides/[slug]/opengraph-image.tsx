// Dynamic OG image for guide pages. Same shape as the blog one:
// proxy the guide's cover_image if set, otherwise generate a dynamic
// title-on-brand PNG. Handles both the new web-guide format and the
// older PDF-guide format with the same logic.

import { ImageResponse } from 'next/og'
import { getPublishedWebGuideBySlug } from '@/lib/guides-content-db'
import { getGuideBySlug } from '@/lib/guides-db'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function GuideOgImage({
  params,
}: {
  params: { slug: string }
}) {
  // Web guide first, then PDF guide fallback. Mirrors the page lookup.
  const webGuide = await getPublishedWebGuideBySlug(params.slug)
  const pdfGuide = webGuide ? null : await getGuideBySlug(params.slug)
  const title = webGuide?.title ?? pdfGuide?.name ?? 'Jax | Family Travels'
  const cover = webGuide?.cover_image ?? pdfGuide?.cover_image ?? null

  if (cover) {
    try {
      const res = await fetch(cover)
      if (res.ok) {
        return new Response(res.body, {
          headers: {
            'content-type': res.headers.get('content-type') ?? 'image/jpeg',
            'cache-control': 'public, max-age=31536000, immutable',
          },
        })
      }
    } catch {
      // Fall through to dynamic generation.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, #1e40af 0%, #2d6b4f 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          padding: 100,
        }}
      >
        <div
          style={{
            fontSize: 22,
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: '0.28em',
            fontWeight: 600,
            marginBottom: 30,
          }}
        >
          Jax  |  Family Travels
        </div>
        <div
          style={{
            fontSize: title.length > 60 ? 60 : 72,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            maxWidth: '85%',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 30,
            opacity: 0.85,
            fontWeight: 500,
          }}
        >
          Travel guide
        </div>
      </div>
    ),
    size,
  )
}
