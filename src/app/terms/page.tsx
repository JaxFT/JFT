import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that apply to using Jax | Family Travels and any guides or subscriptions you buy from us.',
}

const LAST_UPDATED = '18 May 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 inline-flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Legal
        </p>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-jft prose-lg max-w-none">
          <p>These are the terms (&quot;Terms&quot;) on which we, Bec and Oli (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), provide the Jax | Family Travels website at <strong>jaxfamilytravels.com</strong> (the &quot;Site&quot;) and any digital products sold through it.</p>

          <p>By creating an account or buying anything from us, you agree to these Terms. If you don&apos;t agree, please don&apos;t use the Site.</p>

          <h2>1. Who we are</h2>
          <p>Jax | Family Travels is operated by Bec and Oli, a family in the United Kingdom. You can reach us at <a href="mailto:hello@jaxfamilytravels.com">hello@jaxfamilytravels.com</a>.</p>

          <h2>2. The service</h2>
          <p>The Site provides:</p>
          <ul>
            <li>Free content (blog posts, the public previews of guides, and the I Want To Travel decision tool for signed-in members)</li>
            <li>A premium subscription (currently £25 per year) that unlocks all guides, premium blog posts, and learning packs</li>
            <li>Individual guides for one-off purchase</li>
            <li>One-to-one consultation calls with us, booked through the Work With Us page</li>
          </ul>
          <p>Pricing, content, and availability can change. We&apos;ll honour the terms in force at the time you bought anything.</p>

          <h2>3. Your account</h2>
          <p>You must be 18 or over to create an account. You&apos;re responsible for keeping your login credentials secure and for any activity on your account. Tell us if you think your account has been compromised.</p>
          <p>You can delete your account at any time by emailing us. We&apos;ll process the deletion within 30 days, subject to any data we&apos;re legally required to keep (see our <Link href="/privacy">Privacy Policy</Link>).</p>

          <h2>4. Premium subscription</h2>
          <p>The premium subscription gives you access to all premium content on the Site for one year from the date of purchase. At the end of that year, your access ends unless you renew.</p>
          <p>Subscriptions are not currently auto-renewing. If we change to auto-renewal in future, we&apos;ll notify you in advance and you&apos;ll have a chance to opt out.</p>
          <p>If we materially reduce the content available to premium subscribers during your subscription period, we&apos;ll give you a pro-rata refund on request.</p>

          <h2>5. Individual guide purchases</h2>
          <p>When you buy an individual guide, you get ongoing access to read it on the Site, and where available, a downloadable PDF copy for personal use.</p>
          <p>Guides are for your personal use. Please don&apos;t share, republish, or sell our content. We put real time into writing it.</p>

          <h2>6. Refunds</h2>
          <p>Under UK consumer law (Consumer Contracts Regulations 2013), you normally have a 14-day right to cancel digital purchases. By starting to read or download a guide, you waive that right — the law allows us to require this for digital content delivered immediately, and we&apos;ll make this clear at checkout.</p>
          <p>If you&apos;re unhappy with a purchase, please tell us. We&apos;d much rather sort it out than have you feel ripped off — we&apos;ll consider refund requests case by case.</p>

          <h2>7. One-to-one calls</h2>
          <p>If you book a call with us, we&apos;ll send you proposed times and pricing by email. Payment is taken before the call. If you need to reschedule, please give us at least 48 hours&apos; notice. No-shows or last-minute cancellations may forfeit the fee at our discretion.</p>
          <p>Calls are informational. We share our personal experience of family travel. We&apos;re not licensed financial advisers, immigration lawyers, or medical professionals — any decisions you make based on our chat are your own.</p>

          <h2>8. Content accuracy</h2>
          <p>We write from real lived experience. Prices, opening hours, visa rules, and local conditions change all the time. We do our best to keep guides current, but you should verify time-critical details before you travel.</p>

          <h2>9. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Republish, redistribute, or resell our content without permission</li>
            <li>Attempt to access parts of the Site you haven&apos;t paid for</li>
            <li>Use the Site to send spam, harass others, or do anything illegal</li>
            <li>Reverse-engineer or scrape the Site</li>
          </ul>
          <p>We may suspend or terminate accounts that breach these rules.</p>

          <h2>10. Our liability</h2>
          <p>Nothing in these Terms limits our liability where it would be illegal to do so — for example, for death or personal injury caused by our negligence, or for fraud.</p>
          <p>Subject to that, our total liability to you for any claim arising from your use of the Site is limited to the amount you&apos;ve paid us in the 12 months before the claim arose (or £100 if you haven&apos;t paid us anything).</p>
          <p>We&apos;re not liable for indirect or consequential losses — for example, missed flights, ruined holidays, or business losses you might suffer as a result of acting on something you read here.</p>

          <h2>11. Changes to these Terms</h2>
          <p>We may update these Terms occasionally. We&apos;ll email registered users about material changes. The &quot;last updated&quot; date above will always reflect the current version. Continued use of the Site after a change means you accept the updated Terms.</p>

          <h2>12. Governing law</h2>
          <p>These Terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

          <h2>13. Contact</h2>
          <p>Email: <a href="mailto:hello@jaxfamilytravels.com">hello@jaxfamilytravels.com</a></p>

          <hr />

          <p className="text-sm text-gray-500 italic">
            This is starter terms text. If you&apos;re a visitor to the site reading this, these terms describe the basis on which we provide the service. If you&apos;re the site owner, please have a UK solicitor review this before relying on it — particularly the refund and liability clauses, which need to match the specific products you&apos;re actually selling.
          </p>
        </div>
      </article>
    </div>
  )
}
