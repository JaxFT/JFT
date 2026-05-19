'use client'

// Set or clear the kid's home country. Home is excluded from
// "new countries explored" travel stats so a kid who lives in (say)
// the UK can still complete the UK pack and earn its section stamps
// without the UK counting toward their travel milestones.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Loader2, Check } from 'lucide-react'

type PackMetaLite = { slug: string; country: string; flag: string }

export default function HomeCountrySection({
  childId,
  childName,
  initialHomeSlug,
  allPacks,
}: {
  childId: string
  childName: string
  initialHomeSlug: string | null
  allPacks: PackMetaLite[]
}) {
  const router = useRouter()
  const [slug, setSlug] = useState<string>(initialHomeSlug ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = (slug || null) !== (initialHomeSlug || null)

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/family/children/${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home_country_slug: slug || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Home className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Home country</h2>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        Where {childName} lives. They can still do this country&apos;s Adventure Pack and earn its section
        stamps, but it won&apos;t count toward &quot;new countries explored&quot; travel stats. Leave blank to
        treat every country as new.
      </p>

      {/* Native selects on iOS Safari can refuse to shrink below the
          intrinsic width of their widest <option>, which pushed the
          Save button off the right edge of the screen. `min-w-0` lets
          the flex item shrink past that intrinsic width; the short
          placeholder copy below also helps. */}
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <select
          value={slug}
          onChange={e => setSlug(e.target.value)}
          className="flex-1 min-w-0 w-full sm:w-auto px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">— No home set —</option>
          {allPacks.map(p => (
            <option key={p.slug} value={p.slug}>{p.flag} {p.country}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-60 shrink-0"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : saved
              ? <><Check className="w-4 h-4" /> Saved</>
              : 'Save'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3">{error}</p>
      )}
    </section>
  )
}
