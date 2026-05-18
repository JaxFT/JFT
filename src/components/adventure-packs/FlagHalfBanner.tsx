// Listing card banner: left half is the country flag (object-contain so
// every flag, regardless of aspect ratio, is visible in full without
// being cropped or stretched), framed with a thin border so it reads
// as a flag rather than a CSS background. Right half is the country
// name on the dark brand green, consistent across every card so the
// white text is always readable.
//
// Uses flagcdn PNG (not SVG), since Safari on some macOS versions
// fails to render flagcdn's SVGs reliably while the PNGs work in
// every browser. srcSet covers 1x and 2x displays.

type Props = {
  iso2: string
  country: string
  className?: string
  as?: 'h1' | 'h2'
}

export default function FlagHalfBanner({
  iso2,
  country,
  className = '',
  as: Heading = 'h2',
}: Props) {
  return (
    <div className={`flex h-32 ${className}`}>
      <div className="w-1/2 bg-white flex items-center justify-center p-3 border-r border-gray-100">
        <img
          src={`https://flagcdn.com/w320/${iso2}.png`}
          srcSet={`https://flagcdn.com/w320/${iso2}.png 1x, https://flagcdn.com/w640/${iso2}.png 2x`}
          alt={`Flag of ${country}`}
          className="max-w-full max-h-full object-contain border border-gray-300 rounded-sm shadow-sm"
        />
      </div>
      <div className="w-1/2 bg-brand-900 flex items-center justify-center px-3">
        <Heading className="text-lg sm:text-xl font-bold text-white text-center leading-tight">
          {country}
        </Heading>
      </div>
    </div>
  )
}
