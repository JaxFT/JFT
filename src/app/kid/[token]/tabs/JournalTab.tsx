import PassportPage from '@/components/passport/PassportPage'
import type { PermissionMode } from '@/lib/passport-types'

export default function JournalTab({
  childName,
  permissionMode,
}: {
  childName: string
  permissionMode: PermissionMode
}) {
  const ctaCopy =
    permissionMode === 'view'
      ? 'Ask a grown-up to write something special in your journal.'
      : permissionMode === 'guided'
        ? 'Soon you\'ll be able to answer a few questions about today.'
        : 'Soon you\'ll be able to write whatever you want about today.'

  return (
    <PassportPage className="p-6 sm:p-8 min-h-[60vh]">
      <p
        className="text-xs font-extrabold uppercase tracking-[0.2em] mb-1"
        style={{ color: '#5a3a12' }}
      >
        Journal
      </p>
      <p
        className="text-xs uppercase tracking-widest mb-6"
        style={{ color: '#5a3a12', opacity: 0.6 }}
      >
        {childName}&apos;s entries
      </p>

      <div
        className="text-center py-16 text-sm"
        style={{ color: '#5a3a12', opacity: 0.75 }}
      >
        <p className="text-lg font-semibold mb-2">No entries yet.</p>
        <p className="text-xs uppercase tracking-widest opacity-70 max-w-xs mx-auto leading-relaxed">
          {ctaCopy}
        </p>
      </div>
    </PassportPage>
  )
}
