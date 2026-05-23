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
          '/family',           // auth-bound parent dashboards
          '/kid/',             // kid passport URLs contain QR tokens, never index
          '/stamp-export',     // one-off internal route for PNG exports
          '/reset-password',
          '/update-password',
          '/unsubscribe',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
