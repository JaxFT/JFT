// Inline JSON-LD structured-data emitter. Used by blog posts and
// guides to give Google a Schema.org Article description, which makes
// the page eligible for rich-result treatment in search.
//
// Renders a <script type="application/ld+json"> with the serialised
// object. Safe: dangerouslySetInnerHTML is the canonical pattern for
// inline JSON-LD and the content is built server-side from typed
// inputs, not user-controlled HTML.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jaxfamilytravels.com'

export type ArticleSchema = {
  url: string
  headline: string
  description?: string | null
  image?: string | null
  datePublished?: string | null
  dateModified?: string | null
  authorName?: string
  tags?: string[]
}

export function ArticleJsonLd(props: ArticleSchema) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': props.url },
    headline: props.headline,
    publisher: {
      '@type': 'Organization',
      name: 'Jax | Family Travels',
      url: SITE,
    },
    author: {
      '@type': 'Person',
      name: props.authorName ?? 'Bec & Oli — Jax | Family Travels',
    },
  }
  if (props.description) data.description = props.description
  if (props.image) data.image = [props.image]
  if (props.datePublished) data.datePublished = props.datePublished
  if (props.dateModified) data.dateModified = props.dateModified
  if (props.tags && props.tags.length > 0) data.keywords = props.tags.join(', ')

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
