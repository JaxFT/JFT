/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'wjpmdwugnwuydomdmetf.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        // Override Next.js's default 1-year s-maxage on HTML pages so
        // Cloudflare's edge cache stops serving stale HTML that
        // references replaced bundle URLs. Static assets under
        // /_next/static/ are excluded — those have content-hashed
        // filenames and SHOULD cache for a year.
        source: '/((?!_next/static|_next/image|favicon).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
