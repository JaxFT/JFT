import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Jax | Family Travels collects, uses, and protects your personal data.',
}

// Last meaningful change to the policy itself. Update when the substance
// of the policy changes — not on every routine code edit.
const LAST_UPDATED = '18 May 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2 inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Legal
        </p>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-jft prose-lg max-w-none">
          <p>This is the Privacy Policy for Jax | Family Travels (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), the website at <strong>jaxfamilytravels.com</strong>. It explains what personal data we collect, why we collect it, who we share it with, and what rights you have over your data.</p>

          <p>If you have any questions about this policy, email <a href="mailto:hello@jaxfamilytravels.com">hello@jaxfamilytravels.com</a>.</p>

          <h2>Who we are</h2>
          <p>Jax | Family Travels is a small family-run website operated by Bec and Oli, currently based in the United Kingdom. We&apos;re the data controller for the information described in this policy.</p>

          <h2>What we collect and why</h2>

          <h3>When you create an account</h3>
          <p>We collect:</p>
          <ul>
            <li><strong>Your name</strong> — so we can address you correctly on the site and in emails.</li>
            <li><strong>Your email address</strong> — to log you in, send account-related emails (signup confirmation, password reset), and, if you opted in, send marketing updates.</li>
            <li><strong>A password</strong> — stored in encrypted form by our authentication provider. We never see your plain-text password.</li>
            <li><strong>Account metadata</strong> — when you signed up, your subscription tier (free or premium), and your marketing preference.</li>
          </ul>

          <h3>When you fill in the &quot;Work With Us&quot; form</h3>
          <p>We collect everything you choose to share: your name, email, family situation, location, where you are in your travel journey, what you&apos;d like to discuss, and your timezone. We use this to reply to your enquiry and prepare for our call together.</p>

          <h3>When you buy a guide or subscribe</h3>
          <p>We pass billing information directly to <strong>Stripe</strong>, our payment processor. We do not store your card details on our servers. Stripe sends us a record of the purchase so we can grant you access to what you bought.</p>

          <h3>When you browse the site</h3>
          <p>Our hosting provider, Cloudflare, processes basic technical information (IP address, browser type, pages visited) for security and performance. We do not currently use analytics cookies, behavioural tracking, or advertising trackers.</p>

          <h2>Cookies</h2>
          <p>We use a small number of strictly-necessary cookies — set by our authentication provider — to keep you signed in. Under UK PECR these don&apos;t require a consent banner. We do not use marketing or analytics cookies. If we add any in future, we&apos;ll update this policy and request your consent first.</p>

          <h2>Who we share your data with</h2>
          <p>We rely on a small number of third-party services to run the site. Each one has its own privacy policy and is contractually obliged to protect your data.</p>

          <ul>
            <li><strong>Supabase</strong> — stores your account, profile, and any content you create on the site. Hosted in the EU.</li>
            <li><strong>Cloudflare</strong> — serves the website itself and routes email forwarding for our addresses.</li>
            <li><strong>Resend</strong> — sends transactional and (if you opted in) marketing emails on our behalf.</li>
            <li><strong>Stripe</strong> — processes payments. Only used when you buy something.</li>
          </ul>

          <p>We do not sell your data. We do not share it with marketers, advertisers, or any third party for purposes other than running this service.</p>

          <h2>How long we keep your data</h2>
          <p>We keep your account data for as long as your account is active. If you ask us to delete your account, we&apos;ll remove your profile and personal data within 30 days, except where we&apos;re legally required to keep records (for example, tax records for purchases — kept for 7 years under UK law).</p>
          <p>Call request submissions are kept until the conversation is complete and for a reasonable follow-up period (typically 12 months) after that.</p>

          <h2>Marketing emails</h2>
          <p>We only send marketing emails to people who explicitly opted in at signup or via their account settings. Every marketing email contains a one-click unsubscribe link that works without logging in. You can also opt out any time at <Link href="/account">/account</Link>.</p>
          <p>Transactional emails (account confirmations, password resets, purchase receipts, replies to your enquiries) are not marketing — we&apos;ll send those whenever they&apos;re needed.</p>

          <h2>Your rights under UK GDPR</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
            <li><strong>Rectification</strong> — ask us to correct anything that&apos;s wrong.</li>
            <li><strong>Erasure</strong> — ask us to delete your data (subject to legal retention requirements).</li>
            <li><strong>Portability</strong> — receive your data in a machine-readable format.</li>
            <li><strong>Objection</strong> — object to processing for marketing purposes (just opt out — no need to email us).</li>
            <li><strong>Withdraw consent</strong> — for anything we process on the basis of consent, you can withdraw consent at any time.</li>
          </ul>
          <p>To exercise any of these rights, email <a href="mailto:hello@jaxfamilytravels.com">hello@jaxfamilytravels.com</a>. We aim to respond within one calendar month.</p>

          <h2>Complaints</h2>
          <p>If you&apos;re unhappy with how we handle your data, please tell us first so we can put it right. If you&apos;re still not satisfied you have the right to complain to the UK Information Commissioner&apos;s Office at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>

          <h2>Changes to this policy</h2>
          <p>We may update this policy from time to time — typically when we add a new service or change how we use data. Material changes will be communicated to you by email. The &quot;last updated&quot; date at the top of this page reflects the most recent revision.</p>

          <h2>Contact</h2>
          <p>Email: <a href="mailto:hello@jaxfamilytravels.com">hello@jaxfamilytravels.com</a></p>

          <hr />

          <p className="text-sm text-gray-500 italic">
            This is starter policy text. If you&apos;re a visitor to the site reading this, the policy describes our genuine practices. If you&apos;re the site owner, please have a UK solicitor review this before relying on it for compliance.
          </p>
        </div>
      </article>
    </div>
  )
}
