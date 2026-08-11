import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { proxyImageUrl } from '@/lib/image-proxy'
import type { RelatedGuideCard } from '@/lib/related-content'

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

// "Other guides for this country" section, shown on both guide page
// types. Sits above RelatedPostsSection, guides are the higher-value
// pillar content so they lead, blog posts follow underneath.
export default function RelatedGuidesSection({
  guides, heading, bare = false,
}: {
  guides: RelatedGuideCard[]
  heading: string
  bare?: boolean
}) {
  if (guides.length === 0) return null
  return (
    <div className={bare ? 'mt-8' : 'max-w-3xl mx-auto px-4 sm:px-6 mt-12'}>
      <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">{heading}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {guides.map(guide => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="group flex gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3 hover:border-brand-200 hover:shadow-md transition-all"
          >
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              {guide.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxyImageUrl(guide.cover_image)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-full w-fit mb-1">
                {formatPrice(guide.price_pence)}
              </span>
              <p className="font-semibold text-sm text-gray-900 group-hover:text-brand-700 line-clamp-2">{guide.title}</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 mt-1">
                View guide <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
