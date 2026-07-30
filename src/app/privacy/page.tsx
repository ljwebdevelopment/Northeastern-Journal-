import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy & Email Policy",
  description:
    "How the Northeastern Journal handles reader data, newsletter subscriptions, and email consent.",
  alternates: { canonical: `${siteConfig.url}/privacy` },
};

/**
 * Plain-language privacy notice covering what the newsletter actually does.
 * It is written to be accurate about this implementation — double opt-in,
 * one-click unsubscribe, no third-party sharing — not as boilerplate.
 *
 * It is not legal advice. Have counsel review before relying on it for GDPR
 * or state-privacy-law compliance.
 */
export default function PrivacyPage() {
  return (
    <div className="content-container py-10">
      <Breadcrumbs items={[{ name: "Privacy", href: "/privacy" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "Privacy", url: `${siteConfig.url}/privacy` },
            ])
          ),
        }}
      />

      <header className="mx-auto max-w-3xl">
        <p className="kicker">Policy</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">Privacy &amp; Email</h1>
        <p className="mt-4 text-lg text-muted">
          What we collect, why, and how to make us stop.
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert mx-auto mt-10 max-w-[38rem] prose-headings:font-serif">
        <h2>The short version</h2>
        <p>
          We collect an email address if you choose to subscribe to the
          newsletter. That is it. We do not sell, rent, or share reader data
          with advertisers or data brokers, and we do not run third-party
          advertising trackers on this site.
        </p>

        <h2>The newsletter</h2>
        <ul>
          <li>
            <strong>Double opt-in.</strong> When you enter your address we send
            one email asking you to confirm. Until you click that link, you
            receive nothing else. If you never confirm, the record sits unused.
          </li>
          <li>
            <strong>What we store.</strong> Your email address, an optional
            name, the date you subscribed, and — as evidence of consent, which
            anti-spam law requires us to keep — the IP address and browser the
            signup came from.
          </li>
          <li>
            <strong>Unsubscribing.</strong> Every email has a one-click
            unsubscribe link in the footer, and supports your mail app&apos;s
            own unsubscribe button. No sign-in, no survey, no delay.
          </li>
          <li>
            <strong>Deletion.</strong> Unsubscribing stops all mail. To have
            your record erased entirely rather than marked unsubscribed, email
            us and we&apos;ll delete it.
          </li>
        </ul>

        <h2>Who processes your data</h2>
        <p>
          Email delivery is handled by <strong>Resend</strong>, and subscriber
          records are stored in <strong>Supabase</strong> (Postgres). The site
          runs on <strong>Vercel</strong>. Each is a processor acting on our
          instructions; none of them receives your address for their own
          marketing.
        </p>

        <h2>Analytics</h2>
        <p>
          We do not use cookie-based advertising analytics. Any traffic
          measurement is aggregate and does not identify individual readers.
        </p>

        <h2>Your rights</h2>
        <p>
          If you are in the EU or UK, GDPR gives you the right to access,
          correct, export, or erase the data we hold about you, and to withdraw
          consent at any time. Several US states grant similar rights. Email us
          and we will act on the request; we will not make you prove where you
          live first.
        </p>

        <h2>Contact</h2>
        <p>
          <a href="mailto:editor@northeasternjournal.com">
            editor@northeasternjournal.com
          </a>
          <br />
          Northeastern Journal, Northeastern Oklahoma, USA
        </p>

        <p className="text-sm">
          <em>
            This notice describes our actual practice. It is not legal advice;
            if the Journal&apos;s data handling changes, this page changes with
            it.
          </em>
        </p>
      </div>
    </div>
  );
}
