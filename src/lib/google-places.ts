// Client-side helper for Places API (New) Autocomplete + Place
// Details. Browser-side on purpose — NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
// is restricted by HTTP referrer in Google Cloud Console, not by
// secrecy, so calling it straight from the browser is the intended,
// documented pattern.
//
// getPlaceAddress requests addressComponents (Essentials SKU) after a
// suggestion is picked, both to auto-fill country/town and, as a
// bonus, because an Essentials-tier Place Details call is exactly
// what "terminates" an Autocomplete session for the cheaper
// session-based billing — same session token, one round trip, two
// jobs.

export type PlaceSuggestion = {
  placeId: string
  mainText: string
  secondaryText: string
}

export function newSessionToken(): string {
  return crypto.randomUUID()
}

export function googleMapsUrlFromPlaceId(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`
}

// Reverses googleMapsUrlFromPlaceId. Only recognises links generated
// by this app (via the Autocomplete picker), not arbitrary Google Maps
// URLs pasted from elsewhere — those come in too many incompatible
// formats (share links, lat/lng, embed URLs) to parse reliably. Used
// to match a Recommendation to a blog post by place identity instead
// of free-text name, see lib/recommendation-blog-links.ts.
export function extractPlaceId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/place_id:([^&]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

// Thrown instead of silently returning [] so callers (and future
// debugging) can tell "the search genuinely found nothing" apart from
// "the request itself failed" (missing key, network error, blocked by
// a content blocker, bad referrer restriction, quota, etc.) — those
// used to look identical to a user, which made a real outage
// indistinguishable from an empty result.
export class PlacesApiError extends Error {}

export async function autocompletePlaces(input: string, sessionToken: string): Promise<PlaceSuggestion[]> {
  if (!input.trim()) return []
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new PlacesApiError('Google Places API key is not configured for this build')

  let res: Response
  try {
    res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({ input, sessionToken }),
    })
  } catch (e) {
    throw new PlacesApiError(e instanceof Error ? e.message : 'Network request failed')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new PlacesApiError(`Places API returned ${res.status}: ${text.slice(0, 300)}`)
  }

  const body = await res.json().catch(() => null) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId: string
        structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }
        text?: { text: string }
      }
    }>
  } | null

  return (body?.suggestions ?? [])
    .map(s => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
    .map(p => ({
      placeId: p.placeId,
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
    }))
}

export type PlaceAddress = { iso2: string | null; town: string | null }

// Town preference order: "postal_town" goes first — in the UK/Ireland,
// "locality" often resolves to a sub-area or ward (e.g. "Centre"
// within Hastings) rather than the town itself, while postal_town is
// reliably the actual town name. Most other countries don't return a
// postal_town at all, so this falls through to "locality" there, with
// administrative_area_level_2 (a county/district) as the last resort.
const TOWN_TYPE_PRIORITY = ['postal_town', 'locality', 'administrative_area_level_2']

export async function getPlaceAddress(placeId: string, sessionToken: string): Promise<PlaceAddress> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!apiKey) return { iso2: null, town: null }

  let res: Response
  try {
    res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'addressComponents',
      },
    })
  } catch (e) {
    console.error('Place Details request failed', e)
    return { iso2: null, town: null }
  }
  if (!res.ok) {
    console.error('Place Details error', res.status, await res.text().catch(() => ''))
    return { iso2: null, town: null }
  }

  const body = await res.json().catch(() => null) as {
    addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>
  } | null
  const components = body?.addressComponents ?? []

  const country = components.find(c => c.types?.includes('country'))
  const town = TOWN_TYPE_PRIORITY
    .map(type => components.find(c => c.types?.includes(type)))
    .find(c => c?.longText)

  return {
    iso2: country?.shortText ? country.shortText.toLowerCase() : null,
    town: town?.longText ?? null,
  }
}
