'use client'

// Family-level home country picker. Sets the parent profile's
// home_country_iso2, which applies to every child in the family.
// Home is excluded from "new countries explored" travel stats so a
// kid living in (say) the UK can still complete the UK Adventure
// Pack and earn its stamps without the UK counting toward their
// travel milestones.
//
// Picker accepts ANY ISO 3166-1 country (not limited to the 35
// Adventure Pack countries). Type-to-search modal — quicker for a
// list this long than a continent drill-down.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Loader2, Check, Search, ChevronDown, X } from 'lucide-react'
import { COUNTRIES, getCountryByIso2 } from '@/lib/countries'
import CountryFlag from '@/components/CountryFlag'

// Antarctica is excluded — nobody's marking that as home.
const PICKABLE_COUNTRIES = COUNTRIES
  .filter(c => c.continent !== 'Antarctica')
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name))

export default function HomeCountrySection({
  initialHomeIso2,
}: {
  initialHomeIso2: string | null
}) {
  const router = useRouter()
  const [iso2, setIso2] = useState<string | null>(initialHomeIso2)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const dirty = (iso2 || null) !== (initialHomeIso2 || null)
  const selected = getCountryByIso2(iso2)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchInputRef.current?.focus())
    } else {
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PICKABLE_COUNTRIES
    return PICKABLE_COUNTRIES.filter(c => c.name.toLowerCase().includes(q))
  }, [query])

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/family/home-country', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home_country_iso2: iso2 || null }),
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
        Where the family lives. Applies to every child in the family. They can still do this country&apos;s
        Adventure Pack (if we have one) and earn its stamps, but it won&apos;t count toward &quot;new countries
        explored&quot; travel stats.
      </p>

      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 min-w-0 w-full sm:w-auto inline-flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm hover:border-brand-300 text-left bg-white"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                <CountryFlag iso2={selected.iso2} country={selected.name} ariaHidden size="sm" />
                <span className="font-semibold text-gray-900 truncate">{selected.name}</span>
              </>
            ) : (
              <span className="text-gray-700">, No home set ,</span>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="btn-primary !py-2.5 !px-5 !text-sm disabled:opacity-60 shrink-0"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            : saved
              ? <><Check className="w-4 h-4" /> Saved</>
              : 'Save'}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[85dvh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 inline-flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" /> Pick a home country
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative p-3 border-b border-gray-100 shrink-0">
              <Search className="absolute top-1/2 left-5 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            <button
              type="button"
              onClick={() => { setIso2(null); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-100 shrink-0 ${
                iso2 === null ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              , No home set ,
            </button>

            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 italic">No countries match &quot;{query}&quot;.</p>
            ) : (
              <ul className="flex-1 overflow-y-auto">
                {filtered.map(c => {
                  const isCurrent = c.iso2 === iso2
                  return (
                    <li key={c.iso2}>
                      <button
                        type="button"
                        onClick={() => { setIso2(c.iso2); setOpen(false) }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left ${
                          isCurrent ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <CountryFlag iso2={c.iso2} country={c.name} ariaHidden size="sm" />
                        {c.name}
                        {isCurrent && <Check className="w-3.5 h-3.5 ml-auto" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3">{error}</p>
      )}
    </section>
  )
}
