// Default loading UI shown during any route transition under the
// root app/ segment. Next renders this while the server component
// for the next page is suspended on data fetches. Without it, the
// previous page stays on screen and clicks feel unresponsive on
// dynamic pages.

import Logo from '@/components/branding/Logo'

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-sand-50 pt-24 flex flex-col items-center justify-start">
      <div className="mt-16 flex flex-col items-center gap-4 opacity-70 animate-pulse">
        <Logo height={28} />
        <span className="text-xs font-semibold tracking-widest uppercase text-gray-500">Loading…</span>
      </div>
    </div>
  )
}
