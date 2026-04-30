import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';

export default function Support() {
  return (
    <Layout>
      <Head>
        <title>Support · Be With Me</title>
        <meta name="description" content="Get help with your Be With Me account, subscriptions, payments, and content." />
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Support
        </h1>
        <p className="text-sm text-gray-400 mb-10">We&apos;re here to help.</p>

        <div className="space-y-10 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Contact Us
            </h2>
            <p className="mb-2">
              Email us anytime at{' '}
              <a
                href="mailto:support@bewithme.live"
                className="text-purple-500 hover:text-purple-400 underline"
              >
                support@bewithme.live
              </a>
            </p>
            <p>We respond to most requests within 24 hours, Monday through Friday.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Common Questions
            </h2>
            <div className="space-y-6">
              <Faq q="How do I cancel my subscription?">
                On iOS, open Settings → tap your name → Subscriptions → Be With Me Live →
                Cancel Subscription. On the web, go to your profile → Subscriptions → Cancel.
                You&apos;ll keep access until the end of your current billing period.
              </Faq>

              <Faq q="How do I delete my account?">
                Go to Settings → Privacy → Delete Account. This anonymizes your profile,
                cancels active subscriptions, and removes your content from public view.
                Permanent and irreversible.
              </Faq>

              <Faq q="I was charged but didn't get my threads or subscription.">
                Apple and Stripe payments can take a few minutes to confirm. If it&apos;s
                been longer than 15 minutes, email{' '}
                <a
                  href="mailto:support@bewithme.live"
                  className="text-purple-500 hover:text-purple-400 underline"
                >
                  support@bewithme.live
                </a>{' '}
                with your transaction ID and we&apos;ll resolve it.
              </Faq>

              <Faq q="How do I report inappropriate content or a user?">
                Tap the three-dot menu on any post, stream, or profile and choose Report.
                Our moderation team reviews reports 24/7. For urgent safety concerns,
                email us directly.
              </Faq>

              <Faq q="How do I become a creator and earn money?">
                Open the app and go to Settings → Become a Creator. Once approved,
                you can set up subscription tiers, receive virtual gifts, and get
                paid out via Stripe.
              </Faq>

              <Faq q="I forgot my password.">
                Go to{' '}
                <a
                  href="/auth/forgot-password"
                  className="text-purple-500 hover:text-purple-400 underline"
                >
                  bewithme.live/auth/forgot-password
                </a>{' '}
                and enter the email associated with your account. We&apos;ll send you
                a reset link.
              </Faq>

              <Faq q="What happens to my purchased threads if I cancel?">
                Threads you&apos;ve purchased remain in your account balance and never
                expire. You can keep using them to send gifts as long as your account
                is active.
              </Faq>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Other Resources
            </h2>
            <ul className="space-y-2">
              <li>
                <a href="/terms" className="text-purple-500 hover:text-purple-400 underline">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-purple-500 hover:text-purple-400 underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/safety" className="text-purple-500 hover:text-purple-400 underline">
                  Community Safety
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{q}</h3>
      <div className="text-gray-600 dark:text-gray-400">{children}</div>
    </div>
  );
}
