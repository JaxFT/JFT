/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'wjpmdwugnwuydomdmetf.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async redirects() {
    // /i-want-to-travel used to redirect into /work-with-us back when
    // it was a stub. The real readiness questionnaire now lives at
    // /i-want-to-travel — no redirects needed.
    return []
  },
  async headers() {
    return [
      {
        // Every HTML page on the site is force-dynamic (per-request
        // SSR), so it can never be safely cached on the edge. The
        // earlier rule used s-maxage=60 + stale-while-revalidate, but
        // that produced a hard-to-debug FOUC: after a deploy the edge
        // happily served day-old HTML pointing at CSS chunk hashes
        // that no longer existed, so the browser 404'd the stylesheet
        // and rendered the page unstyled until a refresh.
        //
        // s-maxage=0 + no stale-while-revalidate forces the edge to
        // hit the Worker on every request. OpenNext on CF Workers is
        // fast enough that this is fine, and stale-HTML / dead-CSS is
        // gone. Static assets under /_next/static/ are excluded by
        // the source regex and keep their year-long immutable cache.
        source: '/((?!_next/static|_next/image|favicon).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
