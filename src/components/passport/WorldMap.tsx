'use client'

// SVG world map showing which countries the kid has unlocked.
// Visited countries glow in brand colour; the rest sit faded. Tapping a
// visited country routes to its country passport page.
//
// The map gets a comfortable minimum width so it doesn't look squashed
// on phones — the parent container can scroll horizontally on small
// screens, which actually feels nice (panning a world map).

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

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

type Props = {
  unlockedSlugs: string[]
  hrefForSlug: (slug: string) => string
}

export default function WorldMap({ unlockedSlugs, hrefForSlug }: Props) {
  const router = useRouter()

  const numericToSlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const [slug, num] of Object.entries(SLUG_TO_NUMERIC)) m.set(num, slug)
    return m
  }, [])

  const unlockedSet = useMemo(() => new Set(unlockedSlugs), [unlockedSlugs])
  const assignableSet = useMemo(() => new Set(Object.keys(SLUG_TO_NUMERIC)), [])

  return (
    // Horizontal scroll wrapper. On wide screens the inner SVG fits
    // the container; on narrow ones the user pans the map. The
    // min-width keeps the projection at a useful scale.
    <div className="w-full overflow-x-auto -mx-2 px-2">
      <div style={{ minWidth: 720, aspectRatio: '2 / 1' }}>
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 160 }}
          style={{ width: '100%', height: '100%' }}
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
                        strokeWidth: 0.4,
                        outline: 'none',
                        cursor: isUnlocked ? 'pointer' : 'default',
                        transition: 'fill 0.2s ease',
                      },
                      hover: {
                        fill: isUnlocked ? '#5fa37a' : isAssignable ? '#d0bd84' : '#ecdfb8',
                        stroke: '#5a3a12',
                        strokeWidth: 0.6,
                        outline: 'none',
                        cursor: isUnlocked ? 'pointer' : 'default',
                      },
                      pressed: {
                        fill: '#3e7757',
                        outline: 'none',
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
    </div>
  )
}
