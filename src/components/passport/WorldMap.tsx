'use client'

// Interactive SVG world map. Flat Mercator projection (the familiar
// Google-Maps look), zoomable down to country level, pannable around
// the globe via drag or touch. Visited countries glow brand green.
// Tapping a visited country routes to its passport page.
//
// Uses react-simple-maps's ZoomableGroup. World geography is loaded
// once from world-atlas at 1:110m via CDN.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Minus, Maximize2 } from 'lucide-react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'

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

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const MIN_ZOOM = 1
const MAX_ZOOM = 20
const INITIAL_CENTER: [number, number] = [0, 20]

type Props = {
  unlockedSlugs: string[]
  hrefForSlug: (slug: string) => string
}

export default function WorldMap({ unlockedSlugs, hrefForSlug }: Props) {
  const router = useRouter()
  // Zoom + center are kept in state so the +/- buttons can drive them
  // imperatively. ZoomableGroup also writes back via onMoveEnd when
  // the user drags or pinches.
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState<[number, number]>(INITIAL_CENTER)

  const numericToSlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const [slug, num] of Object.entries(SLUG_TO_NUMERIC)) m.set(num, slug)
    return m
  }, [])

  const unlockedSet = useMemo(() => new Set(unlockedSlugs), [unlockedSlugs])
  const assignableSet = useMemo(() => new Set(Object.keys(SLUG_TO_NUMERIC)), [])

  const zoomIn   = () => setZoom(z => Math.min(z * 1.5, MAX_ZOOM))
  const zoomOut  = () => setZoom(z => Math.max(z / 1.5, MIN_ZOOM))
  const resetView = () => { setZoom(1); setCenter(INITIAL_CENTER) }

  return (
    <div
      className="relative w-full h-[80vh] min-h-[420px] bg-amber-50 rounded-2xl overflow-hidden border border-amber-200 shadow-inner"
      // Disable native touch gestures so ZoomableGroup gets clean
      // pinch/pan events instead of the browser fighting it.
      style={{ touchAction: 'none' }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 100 }}
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
                      if (slug && isUnlocked) router.push(hrefForSlug(slug))
                    }}
                    style={{
                      default: {
                        fill: isUnlocked
                          ? '#7eb88f'
                          : isAssignable
                            ? '#d8c896'
                            : '#ecdfb8',
                        stroke: '#a37a32',
                        // Stroke gets thinner at high zoom so borders
                        // don't dominate the country fill.
                        strokeWidth: Math.max(0.15, 0.5 / zoom),
                        outline: 'none',
                        cursor: isUnlocked ? 'pointer' : 'default',
                        transition: 'fill 0.2s ease',
                      },
                      hover: {
                        fill: isUnlocked ? '#5fa37a' : isAssignable ? '#d0bd84' : '#ecdfb8',
                        stroke: '#5a3a12',
                        strokeWidth: Math.max(0.25, 0.8 / zoom),
                        outline: 'none',
                        cursor: isUnlocked ? 'pointer' : 'default',
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

      {/* Tiny hint of how to interact — only when at the default view. */}
      {zoom === 1 && (
        <p className="absolute bottom-3 left-3 text-[10px] uppercase tracking-widest text-amber-900/60 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-full pointer-events-none">
          Pinch or scroll to zoom · drag to pan
        </p>
      )}
    </div>
  )
}
