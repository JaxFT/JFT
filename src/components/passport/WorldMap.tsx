'use client'

// Interactive SVG world map. Uses geoNaturalEarth1 — a "flat enough"
// pseudocylindrical projection that keeps Antarctica its real size
// (Mercator stretches it to fill half the southern hemisphere). Tap
// any country to see its name and either open its passport page (if
// the kid has unlocked it) or get a friendly "not visited yet" hint.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Minus, Maximize2, X, ArrowRight } from 'lucide-react'
import { PACK_META } from '@/lib/adventurePackMeta'
import {
  ComposableMap, Geographies, Geography, ZoomableGroup,
} from 'react-simple-maps'

const SLUG_TO_NUMERIC: Record<string, string> = {
  'france':          '250',
  'morocco':         '504',
  'indonesia':       '360',
  'thailand':        '764',
  'malaysia':        '458',
  'spain':           '724',
  'portugal':        '620',
  'united-kingdom':  '826',
  'japan':           '392',
  'vietnam':         '704',
  'cambodia':        '116',
  'china':           '156',
  'india':           '356',
  'sri-lanka':       '144',
  'nepal':           '524',
  'turkey':          '792',
  'egypt':           '818',
}

// Approximate centre [longitude, latitude] for each pack country.
// Used to focus the map's initial view on the kid's home country.
const SLUG_TO_CENTER: Record<string, [number, number]> = {
  'france':          [2,   47],
  'morocco':         [-7,  32],
  'indonesia':       [114, -3],
  'thailand':        [101, 15],
  'malaysia':        [102, 4],
  'spain':           [-4,  40],
  'portugal':        [-8,  39],
  'united-kingdom':  [-3,  54],
  'japan':           [138, 36],
  'vietnam':         [108, 16],
  'cambodia':        [105, 12],
  'china':           [105, 35],
  'india':           [79,  22],
  'sri-lanka':       [81,  8],
  'nepal':           [84,  28],
  'turkey':          [35,  39],
  'egypt':           [30,  26],
}

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const MIN_ZOOM = 1
const MAX_ZOOM = 40
const DEFAULT_CENTER: [number, number] = [10, 20]
const HOME_ZOOM = 4 // ~ continent-level when there's a home country

type SelectedCountry = {
  name: string
  slug: string | null
  isUnlocked: boolean
  isPack: boolean
}

type Props = {
  unlockedSlugs: string[]
  // ISO 3166-1 alpha-2 code of the kid's home country (any country,
  // not just one of the 35 packs). If it matches a pack country we
  // zoom the map to it on first load; otherwise we leave the global
  // view and the home-country highlight just doesn't apply.
  homeCountryIso2?: string | null
  hrefForSlug: (slug: string) => string
}

export default function WorldMap({ unlockedSlugs, hrefForSlug, homeCountryIso2 }: Props) {
  const router = useRouter()
  // Map the iso2 to a pack slug (if any) so we can look up the centre
  // coords in SLUG_TO_CENTER. Non-pack home countries fall through to
  // the default global view.
  const homePackSlug = homeCountryIso2
    ? PACK_META.find(p => p.iso2 === homeCountryIso2.toLowerCase())?.slug ?? null
    : null
  // Start zoomed-in on the kid's home country if it's a pack country;
  // otherwise show a comfortable global view. The kid can pinch back
  // out any time.
  const homeCenter = homePackSlug ? SLUG_TO_CENTER[homePackSlug] : undefined
  const initialZoom = homeCenter ? HOME_ZOOM : 1
  const initialCenter = homeCenter ?? DEFAULT_CENTER
  const [zoom, setZoom] = useState(initialZoom)
  const [center, setCenter] = useState<[number, number]>(initialCenter)
  const [selected, setSelected] = useState<SelectedCountry | null>(null)

  const numericToSlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const [slug, num] of Object.entries(SLUG_TO_NUMERIC)) m.set(num, slug)
    return m
  }, [])

  const unlockedSet = useMemo(() => new Set(unlockedSlugs), [unlockedSlugs])
  const assignableSet = useMemo(() => new Set(Object.keys(SLUG_TO_NUMERIC)), [])

  const zoomIn   = () => setZoom(z => Math.min(z * 1.5, MAX_ZOOM))
  const zoomOut  = () => setZoom(z => Math.max(z / 1.5, MIN_ZOOM))
  const resetView = () => { setZoom(initialZoom); setCenter(initialCenter) }

  return (
    <div
      className="relative w-full aspect-[8/5] max-h-[80dvh] min-h-[280px] bg-amber-50 rounded-2xl overflow-hidden border border-amber-200 shadow-inner"
      style={{ touchAction: 'none' }}
    >
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 165 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={pos => {
            setZoom(pos.zoom)
            setCenter(pos.coordinates as [number, number])
          }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: Array<{ rsmKey: string; id: string; properties: { name: string } }> }) =>
              geographies.map(geo => {
                const slug = numericToSlug.get(geo.id)
                const isUnlocked = slug ? unlockedSet.has(slug) : false
                const isAssignable = slug ? assignableSet.has(slug) : false

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => {
                      setSelected({
                        name: geo.properties.name,
                        slug: slug ?? null,
                        isUnlocked,
                        isPack: isAssignable,
                      })
                    }}
                    style={{
                      default: {
                        fill: isUnlocked
                          ? '#7eb88f'
                          : isAssignable
                            ? '#d8c896'
                            : '#ecdfb8',
                        stroke: '#a37a32',
                        strokeWidth: Math.max(0.15, 0.5 / zoom),
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'fill 0.2s ease',
                      },
                      hover: {
                        fill: isUnlocked ? '#5fa37a' : isAssignable ? '#d0bd84' : '#e8d8a8',
                        stroke: '#5a3a12',
                        strokeWidth: Math.max(0.25, 0.8 / zoom),
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: { fill: '#3e7757', outline: 'none' },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom controls — bottom-right, stacked. */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          className="w-10 h-10 inline-flex items-center justify-center bg-white text-amber-900 hover:bg-amber-50 disabled:opacity-40 shadow-md rounded-full border border-amber-200"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          className="w-10 h-10 inline-flex items-center justify-center bg-white text-amber-900 hover:bg-amber-50 disabled:opacity-40 shadow-md rounded-full border border-amber-200"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={resetView}
          aria-label="Reset view"
          className="w-10 h-10 inline-flex items-center justify-center bg-white text-amber-900 hover:bg-amber-50 shadow-md rounded-full border border-amber-200"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Default-view hint */}
      {zoom === 1 && !selected && (
        <p className="absolute bottom-3 left-3 text-[10px] uppercase tracking-widest text-amber-900/60 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-full pointer-events-none">
          Tap any country · pinch to zoom
        </p>
      )}

      {/* Selected-country popup. Sits at the bottom of the map. */}
      {selected && (
        <div className="absolute bottom-3 left-3 right-16 bg-white rounded-2xl shadow-2xl border border-amber-200 p-4 max-w-sm">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-lg font-extrabold text-amber-950 leading-tight">{selected.name}</p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-amber-900/40 hover:text-amber-900 -mr-1 -mt-1 p-1.5"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {selected.isUnlocked && selected.slug ? (
            <>
              <p className="text-xs text-amber-900/70 mb-3">In your passport.</p>
              <button
                type="button"
                onClick={() => router.push(hrefForSlug(selected.slug!))}
                className="inline-flex items-center gap-1.5 bg-amber-900 hover:bg-amber-950 text-amber-50 text-sm font-semibold px-3 py-2 rounded-full"
              >
                Open passport page <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : selected.isPack ? (
            <p className="text-xs text-amber-900/70">
              Not yet visited. Ask a grown-up to add the {selected.name} Adventure Pack so you can start exploring.
            </p>
          ) : (
            <p className="text-xs text-amber-900/70">
              Not in your passport yet. Maybe one day&nbsp;✈️
            </p>
          )}
        </div>
      )}
    </div>
  )
}
