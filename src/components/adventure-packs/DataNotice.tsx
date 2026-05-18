// Amber banner shown at the top of every section + once at the pack
// shell on first load. Non-dismissable — kids on the road won't always
// have WiFi and they need the screenshot prompt visible.

import { WifiOff } from 'lucide-react'

export default function DataNotice() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-amber-900">
      <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
      <p className="leading-relaxed">
        <strong>No WiFi while you&apos;re out?</strong> Screenshot this page before you head out so you can mark things off later.
      </p>
    </div>
  )
}
