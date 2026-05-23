import type { CSSProperties } from 'react'

// Country flag as the banner background, with the country name laid
// across it in outlined white text. Used by the listing cards, the
// pack hero, and the locked / coming-soon variants on the [slug] page.
//
// The fallback colour shows while the flag SVG is loading from
// flagcdn.com (and as a backstop if the CDN ever fails to respond).

type Size = 'sm' | 'md' | 'lg'

const SIZE_STYLES: Record<Size, { height: string; text: string }> = {
  sm: { height: 'h-32',         text: 'text-2xl sm:text-3xl' },
  md: { height: 'h-40',         text: 'text-3xl sm:text-4xl' },
  lg: { height: 'h-44 sm:h-52', text: 'text-4xl sm:text-5xl' },
}

const OUTLINED_TEXT: CSSProperties = {
  WebkitTextStroke: '1.5px rgba(0,0,0,0.85)',
  paintOrder: 'stroke fill',
  textShadow: '0 2px 6px rgba(0,0,0,0.55)',
}

type Props = {
  iso2: string
  country: string
  fallbackColour: string
  size?: Size
  rounded?: boolean
  className?: string
  as?: 'h1' | 'h2'
}

export default function FlagBanner({
  iso2,
  country,
  fallbackColour,
  size = 'md',
  rounded = false,
  className = '',
  as: Heading = 'h2',
}: Props) {
  const { height, text } = SIZE_STYLES[size]
  // Two layers:
  //   1. A blurred, low-detail version of the flag stretched to cover
  //      the full banner. Cropping doesn't matter here — the blur means
  //      the result reads as a coloured backdrop, not a flag.
  //   2. The real flag on top, with object-contain so the full thing
  //      is visible at its natural aspect ratio (no horizontal-stripe
  //      flags getting squished into a 1:2:1 illusion).
  return (
    <div
      className={`${fallbackColour} ${height} ${rounded ? 'rounded-2xl' : ''} relative flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* Blurred backdrop layer */}
      <img
        src={`https://flagcdn.com/w160/${iso2}.png`}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover scale-125 blur-lg opacity-70"
        loading="lazy"
        decoding="async"
      />
      {/* Real flag, aspect-preserved */}
      <img
        src={`https://flagcdn.com/w640/${iso2}.png`}
        srcSet={`https://flagcdn.com/w640/${iso2}.png 1x, https://flagcdn.com/w1280/${iso2}.png 2x`}
        alt=""
        aria-hidden
        className="relative h-full max-w-full w-auto object-contain shadow-md"
        loading="lazy"
        decoding="async"
      />
      <Heading
        className={`${text} font-black tracking-tight uppercase text-white text-center leading-none px-4 absolute inset-0 flex items-center justify-center`}
        style={OUTLINED_TEXT}
      >
        {country}
      </Heading>
    </div>
  )
}
