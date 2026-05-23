// JSON-LD structured data for adventure-pack pages. Marks each pack as
// a learning Course on Schema.org, with the country as the subject and
// Jax | Family Travels as the provider. Eligible for Google's rich-
// result "Course" treatment.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

type Props = {
  slug: string
  country: string
  flag: string
  isFree: boolean
}

export default function PackJsonLd({ slug, country, flag, isFree }: Props) {
  const url = `${SITE}/adventure-packs/${slug}`
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${country} Adventure Pack`,
    description: `A family-travel adventure pack for ${country}: ten missions (map, language, food, money, geography, scavenger, animals, senses, stories, family chat) plus a word search and tile puzzle. Designed for parents and kids to do together on the road.`,
    url,
    image: `${url}/opengraph-image`,
    about: {
      '@type': 'Country',
      name: country,
    },
    provider: {
      '@type': 'Organization',
      name: 'Jax | Family Travels',
      sameAs: SITE,
    },
    inLanguage: 'en',
    // Course Schema requires a hasCourseInstance for rich results.
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      // Self-paced, no schedule. courseWorkload tells Google rough effort.
      courseWorkload: 'PT2H',
    },
    // Audience helps Google rank for "family activities" / "kid learning".
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'family',
    },
    // Offers section. Free packs are explicitly free; premium are gated
    // behind a subscription (we point Google at the annual price).
    offers: isFree
      ? {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'GBP',
          availability: 'https://schema.org/InStock',
          url,
        }
      : {
          '@type': 'Offer',
          price: '49.99',
          priceCurrency: 'GBP',
          availability: 'https://schema.org/InStock',
          url: `${SITE}/account`,
          description: 'Included with the Jax Family Travels annual membership.',
        },
    keywords: [country, 'family travel', 'adventure pack', 'worldschooling', 'kids learning', flag].join(', '),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
