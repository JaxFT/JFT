// Generates the shareable 9:16 result card (1080x1920, Instagram
// Story / TikTok / WhatsApp status size) for a given traveller type.
// Fetched client-side by the "Share your result" button in QuizClient,
// which either hands it to the native share sheet as an image file or
// falls back to a direct download.
//
// Same ImageResponse approach already used for blog/guide/pack OG
// images (see [slug]/opengraph-image.tsx), just portrait and driven by
// a query param instead of a route param, since there's no per-type
// URL segment to key off.
//
// Icons are inlined as raw SVG paths (copied from the matching
// lucide-react icon), not the lucide-react components themselves.
// Satori (which ImageResponse runs on) only supports a plain SVG/HTML
// element subset, it can't render a third-party component's internals,
// tried that first and the icon silently came out blank.
//
// The header photo is fetched and inlined as a base64 data URI rather
// than referenced by its public path directly. This runs on Cloudflare
// via OpenNext, which has no real filesystem to fs.readFileSync a
// public/ asset from at request time, a same-origin fetch is the
// reliable way to pull in a static image here (same idea as the cover
// image proxy in blog/[slug]/opengraph-image.tsx, just re-encoded
// instead of streamed straight through since this image sits inside a
// composed layout, not standing alone as the whole response).

import { ImageResponse } from 'next/og'
import { TRAVELLER_TYPES, TRAVELLER_TYPE_ORDER, type TravellerTypeId } from '../quiz-data'

export const runtime = 'nodejs'

type IconNode = { tag: 'path'; d: string } | { tag: 'rect'; x: string; y: string; width: string; height: string; rx?: string }

const ICON_NODES: Record<TravellerTypeId, IconNode[]> = {
  planner: [
    { tag: 'rect', x: '8', y: '2', width: '8', height: '4', rx: '1' },
    { tag: 'path', d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' },
    { tag: 'path', d: 'M12 11h4' },
    { tag: 'path', d: 'M12 16h4' },
    { tag: 'path', d: 'M8 11h.01' },
    { tag: 'path', d: 'M8 16h.01' },
  ],
  wanderer: [
    { tag: 'path', d: 'M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22' },
    { tag: 'path', d: 'm18 2 4 4-4 4' },
    { tag: 'path', d: 'M2 6h1.9c1.5 0 2.9.9 3.6 2.2' },
    { tag: 'path', d: 'M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8' },
    { tag: 'path', d: 'm18 14 4 4-4 4' },
  ],
  settler: [
    { tag: 'path', d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' },
    { tag: 'path', d: 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  ],
  adventurer: [
    { tag: 'path', d: 'm8 3 4 8 5-5 5 15H2L8 3z' },
  ],
  hacker: [
    { tag: 'path', d: 'M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z' },
    { tag: 'path', d: 'M2 9v1c0 1.1.9 2 2 2h1' },
    { tag: 'path', d: 'M16 11h.01' },
  ],
  comfort: [
    { tag: 'path', d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' },
  ],
}

function isValidType(v: string | null): v is TravellerTypeId {
  return !!v && (TRAVELLER_TYPE_ORDER as string[]).includes(v)
}

async function fetchPhotoDataUri(origin: string): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/images/homepage/homepage_header_jft.jpg`)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const typeParam = searchParams.get('type')
  const typeId: TravellerTypeId = isValidType(typeParam) ? typeParam : TRAVELLER_TYPE_ORDER[0]
  const result = TRAVELLER_TYPES[typeId]
  const nodes = ICON_NODES[typeId]
  const photoDataUri = await fetchPhotoDataUri(origin)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #1e40af 0%, #2d8163 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          padding: '70px 80px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 32 }}>
          Jax&nbsp;&nbsp;|&nbsp;&nbsp;Family Travels
        </div>

        {photoDataUri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoDataUri}
            alt=""
            width={920}
            height={600}
            style={{ width: '100%', height: 600, objectFit: 'cover', objectPosition: 'center 35%', borderRadius: 36, marginBottom: 48 }}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: 34,
              background: 'rgba(255,255,255,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 40,
            }}
          >
            <svg width={68} height={68} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              {nodes.map((n, i) =>
                n.tag === 'rect'
                  ? <rect key={i} x={n.x} y={n.y} width={n.width} height={n.height} rx={n.rx} />
                  : <path key={i} d={n.d} />,
              )}
            </svg>
          </div>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 16 }}>
            My travel type is
          </div>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 800, lineHeight: 1.05, marginBottom: 26, maxWidth: 860 }}>
            {result.name}
          </div>
          <div style={{ display: 'flex', fontSize: 32, lineHeight: 1.4, opacity: 0.92, maxWidth: 840, marginBottom: 36 }}>
            {result.tagline}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, maxWidth: 860 }}>
            {result.traits.map(t => (
              <div
                key={t}
                style={{
                  display: 'flex',
                  fontSize: 24,
                  fontWeight: 600,
                  padding: '12px 24px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.28)',
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>jaxfamilytravels.com</div>
          <div style={{ display: 'flex', fontSize: 26, opacity: 0.75 }}>Take the quiz →</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
    },
  )
}
