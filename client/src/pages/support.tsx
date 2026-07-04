import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';

export default function Support() {
  return (
    <Layout>
      <Head>
        <title>Support · Be With Me</title>
        <meta name="description" content="Get help with your Be With Me account, subscriptions, payments, and content." />
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-10 pb-24 safe-area-pb">
        {/* ─── Slim celebration header — chrome only, body stays readable ─── */}
        <header className="relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 px-6 py-7 sm:px-8 mb-6 animate-rise">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px gradient-celebration opacity-70" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50 mb-2">
            Here to help
          </p>
          <h1 className="font-sans text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            <span className="text-celebration">Support</span>
          </h1>
          <p className="mt-2 text-sm text-white/50">We&apos;re here for you.</p>
        </header>

        {/* ─── Body — subtle glass, high-contrast, easy to read ─── */}
        <div className="glass-card px-5 py-8 sm:px-8 sm:py-10 space-y-10 text-[15px] leading-7 text-white/70 [&_strong]:font-semibold [&_strong]:text-white/90">

          {/* Contact Us */}
          <section>
            <h2 className="font-sans text-base sm:text-lg font-bold tracking-tight mb-3 text-accent-cyan">
              Contact Us
            </h2>
            {/* Glass action row — ≥44px tap target */}
            <a
              href="mailto:support@bewithme.live"
              className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 min-h-[44px] transition hover:bg-white/[0.08] hover:border-accent-cyan/30 hover:drop-shadow-[0_0_10px_rgba(34,224,214,0.2)] group"
            >
              <span className="text-accent-cyan text-lg select-none" aria-hidden="true">✉</span>
              <span className="text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 group-hover:text-white group-hover:decoration-white/60 transition">
                support@bewithme.live
              </span>
            </a>
            <p className="mt-3">We respond to most requests within 24 hours, Monday through Friday.</p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="font-sans text-base sm:text-lg font-bold tracking-tight mb-4 text-accent-violet">
              Common Questions
            </h2>
            <div className="space-y-3">
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
                  className="text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]"
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
                  className="text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]"
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

          {/* Other Resources */}
          <section>
            <h2 className="font-sans text-base sm:text-lg font-bold tracking-tight mb-4 text-accent-pink">
              Other Resources
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="/terms"
                  className="inline-flex items-center gap-2 min-h-[44px] text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  className="inline-flex items-center gap-2 min-h-[44px] text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/safety"
                  className="inline-flex items-center gap-2 min-h-[44px] text-accent-cyan underline decoration-accent-cyan/40 underline-offset-2 transition hover:text-white hover:decoration-white/60 hover:drop-shadow-[0_0_8px_rgba(34,224,214,0.55)]"
                >
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
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4">
      <h3 className="font-sans font-semibold text-white/90 mb-2 text-[15px]">{q}</h3>
      <div className="text-white/60 text-[14px] leading-7">{children}</div>
    </div>
  );
}
