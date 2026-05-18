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
  return (
    <div
      className={`${fallbackColour} ${height} ${rounded ? 'rounded-2xl' : ''} relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        backgroundImage: `url(https://flagcdn.com/${iso2}.svg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Heading
        className={`${text} font-black tracking-tight uppercase text-white text-center leading-none px-4`}
        style={OUTLINED_TEXT}
      >
        {country}
      </Heading>
    </div>
  )
}
