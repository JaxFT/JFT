import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Instagram, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About us · Jax Family Travels',
  description: "We're Bec, Oli & Jax — a family from the UK who decided in October 2024 to leave the routine behind. This is our story, and why we built Jax Family Travels.",
}

// About-us reads more like a blog post than a marketing page —
// long-form copy, single hero photo, body in serif-leaning paragraphs.
// The Instagram callout sits at the bottom so the read can finish on
// a "come find us" beat.
export default function AboutPage() {
  return (
    <article className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Eyebrow + title */}
        <header className="mb-8">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">About us</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            From one family figuring it out to another
          </h1>
          <p className="text-gray-500 mt-3 text-base">
            Bec, Oli & Jax · UK · travelling since October 2024
          </p>
        </header>

        {/* Hero photo */}
        <div className="relative aspect-[4/3] sm:aspect-[16/10] rounded-2xl overflow-hidden mb-10 bg-gray-100 shadow-sm border border-gray-200">
          <Image
            src="/images/us/bec-oli-jax.jpeg"
            alt="Bec, Oli and Jax — the family behind Jax Family Travels"
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
            priority
          />
        </div>

        {/* Body — long-form copy in a comfortable reading column. */}
        <div className="prose prose-lg prose-gray max-w-none prose-headings:font-bold prose-p:leading-relaxed">
          <p>
            We&apos;re Bec, Oli &amp; Jax, a family from the UK who decided in October 2024 that we wanted more from life than the usual routine.
          </p>

          <p>
            After years of squeezing travel into annual leave and school holidays, we made the decision to take a leap that honestly felt terrifying at the time. We were lucky enough to be granted sabbaticals from work, we deregistered Jax from primary school, packed up our comfortable life back home, and set off for South East Asia with no real idea what full-time family travel would look like for us.
          </p>

          <p className="text-2xl font-bold text-gray-900 leading-snug !my-8">
            What started as a dream quickly became a completely different way of living.
          </p>

          <p>
            We&apos;ve learnt how to slow down, how to worldschool, how to navigate the hard days as well as the incredible ones, and how much children can gain from experiencing the world firsthand. None of this has been perfect, and we never want to pretend it is. We&apos;re figuring things out as we go, just like every other family considering this lifestyle.
          </p>

          <p>
            Through our Instagram page,{' '}
            <a
              href="https://instagram.com/jax.familytravels"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline decoration-brand-300 hover:decoration-brand-700 font-semibold"
            >
              @jax.familytravels
            </a>
            , we speak to families every single day who tell us the same thing:
          </p>

          <blockquote className="border-l-4 border-brand-300 pl-5 italic text-gray-700 !my-8">
            &ldquo;We&apos;d love to do something like this… but we don&apos;t know where to start.&rdquo;
          </blockquote>

          <p>
            Some worry about money. Some worry about education. Others are scared to leave behind stability, careers, or the life they&apos;ve worked so hard to build.
          </p>

          <p>
            We understand all of those fears because we had them too.
          </p>

          <p className="text-xl font-bold text-gray-900 !my-6">
            That&apos;s exactly why we created this website.
          </p>

          <p>
            Everything we share here is built from real experience, the mistakes, the lessons, the budgeting, the planning, the destinations, the worldschooling, the logistics, and the moments that made us realise this lifestyle was possible for ordinary families like ours.
          </p>

          <p>
            Our goal isn&apos;t to convince every family to travel full time.<br />
            It&apos;s simply to help people realise that there are more options than they think.
          </p>

          <p>
            Whether you&apos;re dreaming about a few months abroad, long-term family travel, worldschooling, or completely redesigning your family&apos;s lifestyle, we hope this space helps you feel a little more confident taking that first step.
          </p>

          <p className="text-lg font-semibold text-brand-700 !mt-10 !mb-0">
            From one family figuring it out to another, welcome.
          </p>
        </div>

        {/* Instagram callout — soft CTA at the end of the read. */}
        <section className="mt-12 bg-gradient-to-br from-brand-50 to-amber-50 rounded-3xl p-6 sm:p-8 border border-brand-100">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="bg-white rounded-2xl p-3 shadow-sm shrink-0">
              <Instagram className="w-7 h-7 text-pink-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">Follow along</p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">@jax.familytravels on Instagram</h2>
              <p className="text-gray-600 leading-relaxed mb-4 text-sm sm:text-base">
                Day-to-day moments from the road, the questions we get asked most, and the families finding us through the grid.
              </p>
              <a
                href="https://instagram.com/jax.familytravels"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white text-sm font-bold px-4 py-2.5 rounded-md"
              >
                <Instagram className="w-4 h-4" /> Follow on Instagram <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Where to go next */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/blog" className="block bg-white border border-gray-100 hover:border-brand-200 rounded-2xl p-5 transition-colors shadow-sm">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">Read</p>
            <p className="font-bold text-gray-900">From the road</p>
            <p className="text-xs text-gray-500 mt-1">Stories &amp; honest accounts from our travels.</p>
          </Link>
          <Link href="/adventure-packs" className="block bg-white border border-gray-100 hover:border-brand-200 rounded-2xl p-5 transition-colors shadow-sm">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">Do</p>
            <p className="font-bold text-gray-900">Adventure Packs</p>
            <p className="text-xs text-gray-500 mt-1">Country-specific missions for the whole family.</p>
          </Link>
          <Link href="/work-with-us" className="block bg-brand-950 text-white rounded-2xl p-5 transition-colors shadow-sm hover:bg-black">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-1">Talk</p>
            <p className="font-bold">Work With Us</p>
            <p className="text-xs text-white/70 mt-1">Calls, collabs &amp; collaborations.</p>
          </Link>
        </section>
      </div>
    </article>
  )
}
