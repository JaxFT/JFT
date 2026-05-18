import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/account',
          '/reset-password',
          '/update-password',
          '/unsubscribe',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
