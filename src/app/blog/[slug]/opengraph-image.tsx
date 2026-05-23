// Dynamic OG image for blog posts.
//   - If the post has a cover_image set, we stream those bytes back as
//     the OG image so social shares get the post's real hero photo.
//   - If the post has no cover, we fall back to a generated 1200x630
//     PNG with the post title on the JFT brand gradient (rather than
//     showing the generic site-wide homepage hero, which would look
//     identical for every cover-less post).
//
// Next.js automatically points <meta property="og:image"> at this
// route for every /blog/<slug> page.

import { ImageResponse } from 'next/og'
import { getPublishedPostBySlug } from '@/lib/blog-db'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function BlogOgImage({
  params,
}: {
  params: { slug: string }
}) {
  const post = await getPublishedPostBySlug(params.slug)

  // Cover image exists: just proxy it through. Lets the post's chosen
  // hero photo be the OG image without forcing a re-render.
  if (post?.cover_image) {
    try {
      const res = await fetch(post.cover_image)
      if (res.ok) {
        return new Response(res.body, {
          headers: {
            'content-type': res.headers.get('content-type') ?? 'image/jpeg',
            'cache-control': 'public, max-age=31536000, immutable',
          },
        })
      }
    } catch {
      // Fall through to dynamic generation if the cover URL is broken.
    }
  }

  // Fallback: dynamic title-on-brand PNG.
  const title = post?.title ?? 'Jax | Family Travels'
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
          background: 'linear-gradient(135deg, #2d6b4f 0%, #1e40af 100%)',
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
          The blog
        </div>
      </div>
    ),
    size,
  )
}
