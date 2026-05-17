// Default loading UI shown during any route transition under the
// root app/ segment. Next renders this while the server component
// for the next page is suspended on data fetches. Without it, the
// previous page stays on screen and clicks feel unresponsive on
// dynamic pages.

import { Plane } from 'lucide-react'

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-sand-50 pt-24 flex flex-col items-center justify-start">
      <div className="flex items-center gap-3 text-brand-700 opacity-80 mt-16">
        <Plane className="w-5 h-5 animate-pulse" />
        <span className="text-sm font-semibold tracking-wide uppercase">Loading…</span>
      </div>
    </div>
  )
}
