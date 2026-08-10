'use client'

// Everything on /travel-profile except the Been/Want/Top8 lists
// (PlacesEditor). Deliberately one explicit "Save" for the text
// fields rather than per-field autosave — predictable, and matches
// AccountEditor's pattern elsewhere on the site.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Camera, Check, Compass, ExternalLink, Eye, EyeOff, Loader2, Search, Sparkles, Users, X,
} from 'lucide-react'
import { resizeImageIfLarge } from '@/lib/image-resize'
import { proxyImageUrl } from '@/lib/image-proxy'
import { COUNTRIES, getCountryByIso2 } from '@/lib/countries'
import CountryFlag from '@/components/CountryFlag'
import CoverFocalPicker from '@/components/CoverFocalPicker'
import { TRAVELLER_TYPES, type TravellerTypeId } from '@/app/what-kind-of-traveller-are-you/quiz-data'
import { BACKGROUND_THEMES, BACKGROUND_THEME_ORDER, type BackgroundThemeId } from './background-themes'
import PlacesEditor, { type PlaceRow } from './PlacesEditor'

type TravelProfileRow = {
  is_public: boolean
  hero_photo_url: string | null
  hero_photo_focal_x: number
  hero_photo_focal_y: number
  background_theme: string
  bio: string | null
  current_location: string | null
  traveller_type: string | null
  fav_place: string | null
  fav_food: string | null
  fav_beach: string | null
  fav_swim: string | null
  fav_adventure: string | null
  fav_sunset: string | null
  fav_country_iso2: string | null
  fav_country_why: string | null
  link_label: string | null
  link_url: string | null
  instagram_handle: string | null
}

type BuddyRow = { id: string; buddy_user_id: string; username: string | null; full_name: string | null }
type BuddySearchResult = { id: string; username: string | null; full_name: string | null }

const FAVOURITES: Array<{ key: keyof TravelProfileRow; emoji: string; label: string }> = [
  { key: 'fav_place', emoji: '❤️', label: 'Favourite place' },
  { key: 'fav_food', emoji: '🍜', label: 'Favourite food' },
  { key: 'fav_beach', emoji: '🏖️', label: 'Favourite beach' },
  { key: 'fav_swim', emoji: '🏊', label: 'Favourite swim' },
  { key: 'fav_adventure', emoji: '🥾', label: 'Favourite adventure' },
  { key: 'fav_sunset', emoji: '🌅', label: 'Favourite sunset' },
]

function isValidTravellerType(v: string | null): v is TravellerTypeId {
  return !!v && v in TRAVELLER_TYPES
}

export default function TravelProfileEditor({
  username,
  fullName,
  initialProfile,
  initialPlaces,
  initialBuddies,
  hasPassportVisits,
}: {
  username: string | null
  fullName: string | null
  initialProfile: TravelProfileRow | null
  initialPlaces: PlaceRow[]
  initialBuddies: BuddyRow[]
  hasPassportVisits: boolean
}) {
  const [isPublic, setIsPublic] = useState(initialProfile?.is_public ?? false)
  const [bio, setBio] = useState(initialProfile?.bio ?? '')
  const [location, setLocation] = useState(initialProfile?.current_location ?? '')
  const [favs, setFavs] = useState({
    fav_place: initialProfile?.fav_place ?? '',
    fav_food: initialProfile?.fav_food ?? '',
    fav_beach: initialProfile?.fav_beach ?? '',
    fav_swim: initialProfile?.fav_swim ?? '',
    fav_adventure: initialProfile?.fav_adventure ?? '',
    fav_sunset: initialProfile?.fav_sunset ?? '',
  })
  const [favCountryIso2, setFavCountryIso2] = useState(initialProfile?.fav_country_iso2 ?? null)
  const [favCountryWhy, setFavCountryWhy] = useState(initialProfile?.fav_country_why ?? '')
  const [linkLabel, setLinkLabel] = useState(initialProfile?.link_label ?? '')
  const [linkUrl, setLinkUrl] = useState(initialProfile?.link_url ?? '')
  const [instagramHandle, setInstagramHandle] = useState(initialProfile?.instagram_handle ?? '')
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundThemeId>(
    (initialProfile?.background_theme as BackgroundThemeId) ?? 'brand',
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const travellerType = initialProfile?.traveller_type ?? null

  const [heroUrl, setHeroUrl] = useState(initialProfile?.hero_photo_url ?? null)
  const [focalX, setFocalX] = useState(initialProfile?.hero_photo_focal_x ?? 50)
  const [focalY, setFocalY] = useState(initialProfile?.hero_photo_focal_y ?? 50)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [buddies, setBuddies] = useState<BuddyRow[]>(initialBuddies)
  const [buddyQuery, setBuddyQuery] = useState('')
  const [buddyResults, setBuddyResults] = useState<BuddySearchResult[]>([])
  const [buddySearching, setBuddySearching] = useState(false)
  const [buddyOpen, setBuddyOpen] = useState(false)
  const [buddyBusy, setBuddyBusy] = useState(false)
  const [buddyError, setBuddyError] = useState('')

  // Debounced search against real accounts, buddies are only ever
  // linked to an actual JFT account, no freeform names.
  useEffect(() => {
    const q = buddyQuery.trim()
    if (q.length < 2) { setBuddyResults([]); setBuddySearching(false); return }
    setBuddySearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/travel-profile/buddies/search?q=${encodeURIComponent(q)}`)
        const body = await res.json().catch(() => ({}))
        setBuddyResults(body.results ?? [])
      } catch {
        setBuddyResults([])
      } finally {
        setBuddySearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [buddyQuery])

  const save = async () => {
    setSaveState('saving')
    try {
      const res = await fetch('/api/travel-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_public: isPublic,
          bio,
          current_location: location,
          background_theme: backgroundTheme,
          hero_photo_focal_x: focalX,
          hero_photo_focal_y: focalY,
          fav_country_iso2: favCountryIso2,
          fav_country_why: favCountryWhy,
          link_label: linkLabel,
          link_url: linkUrl,
          instagram_handle: instagramHandle,
          ...favs,
        }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  const handlePhotoFile = async (file: File) => {
    setPhotoError('')
    setPhotoBusy(true)
    try {
      const { file: resized } = await resizeImageIfLarge(file)
      const form = new FormData()
      form.append('file', resized)
      const res = await fetch('/api/travel-profile/photo', { method: 'POST', body: form })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Upload failed')
      setHeroUrl(body.url)
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setPhotoBusy(false)
    }
  }

  const removePhoto = async () => {
    setPhotoBusy(true)
    setPhotoError('')
    try {
      const res = await fetch('/api/travel-profile/photo', { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not remove photo')
      setHeroUrl(null)
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Could not remove photo')
    } finally {
      setPhotoBusy(false)
    }
  }

  const addBuddy = async (result: BuddySearchResult) => {
    setBuddyBusy(true)
    setBuddyError('')
    try {
      const res = await fetch('/api/travel-profile/buddies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buddy_user_id: result.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not add buddy')
      setBuddies(prev => [...prev, body.buddy])
      setBuddyQuery('')
      setBuddyResults([])
      setBuddyOpen(false)
    } catch (e) {
      setBuddyError(e instanceof Error ? e.message : 'Could not add buddy')
    } finally {
      setBuddyBusy(false)
    }
  }

  const removeBuddy = async (id: string) => {
    setBuddies(prev => prev.filter(b => b.id !== id))
    await fetch(`/api/travel-profile/buddies?id=${id}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">My Travel Profile</h1>
        <p className="text-gray-500">Your own page. Who you are as a traveller, not a feed.</p>
      </div>

      {/* Visibility + public link */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {isPublic ? <Eye className="w-5 h-5 text-brand-600 mt-0.5" /> : <EyeOff className="w-5 h-5 text-gray-400 mt-0.5" />}
            <div>
              <p className="font-bold text-gray-900">{isPublic ? 'Your page is public' : 'Your page is private'}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {isPublic
                  ? "Anyone with the link can see it, and it's listed on Real Travellers."
                  : "Only you can see it until you turn this on. Nothing is shared by default."}
              </p>
              {!username && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-1.5 mt-2">
                  Set a username in your{' '}
                  <Link href="/account" className="underline font-semibold">account settings</Link>{' '}
                  before going public, that&apos;s what your page&apos;s link uses.
                </p>
              )}
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isPublic}
              disabled={!username}
              onChange={e => setIsPublic(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-brand-600 peer-disabled:opacity-50 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>
        <div className="flex items-center gap-4 mt-4">
          {username && (
            <Link
              href={`/u/${username}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
            >
              View your page <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-700"
          >
            <Compass className="w-3.5 h-3.5" /> Real Travellers
          </Link>
        </div>
      </section>

      {/* Hero photo */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Your photo</h2>
        <p className="text-sm text-gray-500 mb-4">One photo. Changing it replaces the last one, there's no album.</p>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
            {heroUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proxyImageUrl(heroUrl)}
                alt=""
                className="w-full h-full object-cover"
                style={{ objectPosition: `${focalX}% ${focalY}%` }}
              />
            ) : (
              <Camera className="w-7 h-7 text-gray-300" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f) }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoBusy}
              className="btn-outline !py-2 !px-4 !text-sm disabled:opacity-60"
            >
              {photoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {heroUrl ? 'Change photo' : 'Add a photo'}
            </button>
            {heroUrl && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={photoBusy}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 disabled:opacity-60"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
        {photoError && <p className="text-sm text-red-700 mt-3">{photoError}</p>}

        {heroUrl && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <CoverFocalPicker
              src={proxyImageUrl(heroUrl)}
              x={focalX}
              y={focalY}
              onChange={({ x, y }) => { setFocalX(x); setFocalY(y) }}
              previews={[{ label: 'Your page', aspect: '4 / 3' }]}
            />
          </div>
        )}
      </section>

      {/* Background colour */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Background colour</h2>
        <p className="text-sm text-gray-500 mb-4">Sets the tone behind your photo on your page.</p>
        <div className="flex flex-wrap gap-3">
          {BACKGROUND_THEME_ORDER.map(id => {
            const theme = BACKGROUND_THEMES[id]
            const selected = backgroundTheme === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setBackgroundTheme(id)}
                className={`flex flex-col items-center gap-1.5 ${selected ? '' : 'opacity-70 hover:opacity-100'} transition-opacity`}
              >
                <span
                  className={`w-12 h-12 rounded-full block ${selected ? 'ring-2 ring-offset-2 ring-brand-600' : ''}`}
                  style={{ background: theme.swatch }}
                />
                <span className="text-xs font-medium text-gray-600">{theme.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Identity */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">About you</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <p className="text-sm text-gray-500">
            {fullName || 'Not set'} — edit this in{' '}
            <Link href="/account" className="text-brand-600 underline">account settings</Link>.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Short bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Travelling the world slowly."
            spellCheck
            lang="en"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current location</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value.slice(0, 80))}
            placeholder="Chiang Mai, Thailand"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400 mt-1">Just a status you set yourself, update it whenever you like.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Link</label>
          <p className="text-xs text-gray-400 mb-1.5">One link, your own site, blog, a business, whatever you want to point to.</p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
            <input
              type="text"
              value={linkLabel}
              onChange={e => setLinkLabel(e.target.value.slice(0, 40))}
              placeholder="Your website or blog"
              className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="text"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value.slice(0, 300))}
              placeholder="yourwebsite.com"
              className="px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram</label>
          <div className="flex items-center">
            <span className="px-3 py-2.5 text-sm text-gray-400 border border-r-0 border-gray-200 rounded-l-lg bg-gray-50">@</span>
            <input
              type="text"
              value={instagramHandle}
              onChange={e => setInstagramHandle(e.target.value.slice(0, 30))}
              placeholder="yourhandle"
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </section>

      {/* Travel style */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Travel style</h2>
        {isValidTravellerType(travellerType) ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Your result</p>
              <p className="font-bold text-gray-900">{TRAVELLER_TYPES[travellerType].name}</p>
            </div>
            <Link href="/what-kind-of-traveller-are-you" className="text-sm font-semibold text-brand-600 hover:underline shrink-0">
              Retake the quiz
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">Take the quiz to add your travel style here.</p>
            <Link href="/what-kind-of-traveller-are-you" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline shrink-0">
              <Sparkles className="w-4 h-4" /> Take the quiz
            </Link>
          </div>
        )}
      </section>

      {/* Places */}
      <PlacesEditor initialPlaces={initialPlaces} hasPassportVisits={hasPassportVisits} />

      {/* Favourites */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Your favourites</h2>
        <p className="text-sm text-gray-500 mb-4">All optional. Say who you are as a traveller, not just where you've been.</p>

        <div className="mb-5 pb-5 border-b border-gray-100">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">🏆 Favourite country</label>
          <FavouriteCountryPicker value={favCountryIso2} onSelect={setFavCountryIso2} />
          {favCountryIso2 && (
            <textarea
              value={favCountryWhy}
              onChange={e => setFavCountryWhy(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Why? (optional)"
              className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FAVOURITES.map(f => (
            <div key={f.key as string}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{f.emoji} {f.label}</label>
              <input
                type="text"
                value={favs[f.key as keyof typeof favs]}
                onChange={e => setFavs(prev => ({ ...prev, [f.key]: e.target.value.slice(0, 80) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Travel buddies */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-bold text-gray-900">Travel buddies</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          People you&apos;ve actually travelled with. Only real JFT accounts, search by username, not just typed names.
        </p>
        {buddies.length > 0 && (
          <ul className="flex flex-wrap gap-2 mb-4">
            {buddies.map(b => (
              <li key={b.id} className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-1.5 py-1 text-sm font-medium text-gray-800">
                {b.full_name || b.username}
                <button type="button" onClick={() => removeBuddy(b.id)} className="text-gray-400 hover:text-red-600 p-0.5" aria-label={`Remove ${b.full_name || b.username}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={buddyQuery}
              onChange={e => { setBuddyQuery(e.target.value); setBuddyOpen(true) }}
              onFocus={() => setBuddyOpen(true)}
              placeholder="Search by username…"
              disabled={buddyBusy}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
            />
          </div>
          {buddyOpen && buddyQuery.trim().length >= 2 && (
            <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
              {buddySearching ? (
                <p className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…</p>
              ) : buddyResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500 italic">No accounts match &quot;{buddyQuery}&quot;.</p>
              ) : (
                <ul>
                  {buddyResults
                    .filter(r => !buddies.some(b => b.buddy_user_id === r.id))
                    .map(r => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => addBuddy(r)}
                          disabled={buddyBusy}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50 disabled:opacity-60"
                        >
                          <span className="font-semibold text-gray-900">{r.full_name || r.username}</span>
                          {r.full_name && r.username && <span className="text-gray-400"> @{r.username}</span>}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {buddyError && <p className="text-sm text-red-700 mt-2">{buddyError}</p>}
      </section>

      <div className="sticky bottom-4">
        <button
          type="button"
          onClick={save}
          disabled={saveState === 'saving'}
          className="btn-primary w-full justify-center py-3 shadow-lg disabled:opacity-60"
        >
          {saveState === 'saving' && (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>)}
          {saveState === 'saved' && (<><Check className="w-4 h-4" /> Saved</>)}
          {saveState === 'error' && 'Could not save, try again'}
          {saveState === 'idle' && 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function FavouriteCountryPicker({ value, onSelect }: { value: string | null; onSelect: (iso2: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = value ? getCountryByIso2(value) : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return COUNTRIES
      .filter(c => c.continent !== 'Antarctica')
      .filter(c => !q || c.name.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 text-left px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          {selected
            ? <span className="inline-flex items-center gap-2"><CountryFlag iso2={selected.iso2} country={selected.name} ariaHidden size="sm" />{selected.name}</span>
            : <span className="text-gray-500">Choose a country…</span>}
        </button>
        {selected && (
          <button type="button" onClick={() => onSelect(null)} className="text-gray-400 hover:text-red-600 p-2" aria-label="Clear favourite country">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="sticky top-0 p-2 bg-white border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search…"
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500 italic">No countries match &quot;{query}&quot;.</p>
          ) : (
            <ul>
              {filtered.map(c => (
                <li key={c.iso2}>
                  <button
                    type="button"
                    onClick={() => { onSelect(c.iso2); setQuery(''); setOpen(false) }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-brand-50 text-sm"
                  >
                    <CountryFlag iso2={c.iso2} country={c.name} ariaHidden size="sm" />
                    <span>{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
