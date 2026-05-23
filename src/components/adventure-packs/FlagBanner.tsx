import type { CSSProperties } from 'react'

// Country flag as the banner background, with the country name laid
// across it in outlined white text. Used by the listing cards, the
// pack hero, and the locked / coming-soon variants on the [slug] page.
//
// The flag fills the full container width at its natural aspect ratio
// (no cropping, no stretching). The container's height is therefore
// driven by the flag, so a 5:3 Germany banner is shorter than a 1:1
// Swiss banner — that's by design. The fallback colour shows while
// the flag PNG is loading from flagcdn.com and as a backstop if the
// CDN ever fails.

type Size = 'sm' | 'md' | 'lg'

const TEXT_FOR_SIZE: Record<Size, string> = {
  sm: 'text-2xl sm:text-3xl',
  md: 'text-3xl sm:text-4xl',
  lg: 'text-4xl sm:text-5xl',
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
  const text = TEXT_FOR_SIZE[size]
  return (
    <div
      className={`${fallbackColour} ${rounded ? 'rounded-2xl' : ''} relative overflow-hidden ${className}`}
    >
      {/* The flag fills the container's full width. Height follows the
          flag's natural aspect ratio, so nothing is cropped or stretched. */}
      <img
        src={`https://flagcdn.com/w1280/${iso2}.png`}
        srcSet={`https://flagcdn.com/w640/${iso2}.png 640w, https://flagcdn.com/w1280/${iso2}.png 1280w, https://flagcdn.com/w2560/${iso2}.png 2560w`}
        sizes="(max-width: 768px) 100vw, 800px"
        alt=""
        aria-hidden
        className="block w-full h-auto"
        loading="lazy"
        decoding="async"
      />
      {/* Country label overlays the flag, centred. */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
        <Heading
          className={`${text} font-black tracking-tight uppercase text-white text-center leading-none`}
          style={OUTLINED_TEXT}
        >
          {country}
        </Heading>
      </div>
    </div>
  )
}
