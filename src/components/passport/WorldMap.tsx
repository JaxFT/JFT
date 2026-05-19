'use client'

// A simple SVG world map showing which countries the kid has unlocked.
// Visited countries glow in brand colour; the rest sit faded in the
// background. Tapping a visited country routes to that country's
// passport page. Uses react-simple-maps with the Natural Earth
// countries TopoJSON from a CDN so we don't ship a 100kb data file
// in our own bundle.

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

// Numeric ISO 3166-1 codes for every pack we ship. These match the
// `id` field on each country feature in world-atlas/countries-110m.
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

// CDN-hosted world geography. Loaded once and cached by the browser.
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

type Props = {
  // Slugs of countries the kid has unlocked. These get the brand
  // highlight and are tappable.
  unlockedSlugs: string[]
  // Builds the destination URL for a tapped country. Returns the
  // /kid/{token}/country/{slug} route in kid context.
  hrefForSlug: (slug: string) => string
}

export default function WorldMap({ unlockedSlugs, hrefForSlug }: Props) {
  const router = useRouter()

  // Reverse the slug map so we can look up by numeric id during render.
  const numericToSlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const [slug, num] of Object.entries(SLUG_TO_NUMERIC)) m.set(num, slug)
    return m
  }, [])

  const unlockedSet = useMemo(() => new Set(unlockedSlugs), [unlockedSlugs])
  const assignableSet = useMemo(() => new Set(Object.keys(SLUG_TO_NUMERIC)), [])

  return (
    <div
      className="w-full"
      style={{
        // The map sits on cream paper; the SVG itself fills the
        // parent container so the surrounding PassportPage controls
        // the framing.
        aspectRatio: '2 / 1',
      }}
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 145 }}
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
                        ? '#7eb88f' // brand-300 ish — clearly unlocked
                        : isAssignable
                          ? '#d8c896' // faded sand — "you could go here"
                          : '#ecdfb8', // base paper colour for the rest
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
  )
}
