// Listing card banner: left half is the country flag (object-contain so
// every flag, regardless of aspect ratio, is visible in full without
// being cropped or stretched), right half is the country name on the
// pack's hero colour.

type Props = {
  iso2: string
  country: string
  fallbackColour: string
  className?: string
  as?: 'h1' | 'h2'
}

export default function FlagHalfBanner({
  iso2,
  country,
  fallbackColour,
  className = '',
  as: Heading = 'h2',
}: Props) {
  return (
    <div className={`flex h-32 ${className}`}>
      <div className="w-1/2 bg-white flex items-center justify-center p-3 border-r border-gray-100">
        <img
          src={`https://flagcdn.com/${iso2}.svg`}
          alt={`Flag of ${country}`}
          loading="lazy"
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <div className={`w-1/2 ${fallbackColour} flex items-center justify-center px-3`}>
        <Heading className="text-lg sm:text-xl font-bold text-white text-center leading-tight">
          {country}
        </Heading>
      </div>
    </div>
  )
}
