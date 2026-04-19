import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';

export default function Privacy() {
  return (
    <Layout>
      <Head>
        <title>Privacy Policy · Be With Me</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-400 mb-10">Effective Date: April 19, 2026 · Last Updated: April 19, 2026</p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <p>
            Be With Me (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the Be With Me live-streaming
            platform available at bewithme.live and via the Be With Me iOS app. This
            Privacy Policy explains what personal information we collect, how we use
            it, who we share it with, and the choices and rights you have. By using
            Be With Me you agree to the practices described here.
          </p>

          <Section number="1" title="Information We Collect">
            <p className="mb-2"><strong>Account information.</strong> When you register we collect your
            email address, chosen username, display name, password (stored as a
            bcrypt hash — never in plain text), and your birth date for age
            verification.</p>
            <p className="mb-2"><strong>Profile content.</strong> Optional profile photo, bio, links you
            add yourself, and preferences.</p>
            <p className="mb-2"><strong>User-generated content.</strong> Live streams (video + audio),
            stream replays, chat messages, direct messages, reels, stories, posts,
            gifts you send or receive, invites and comments.</p>
            <p className="mb-2"><strong>Device + technical data.</strong> Device type, operating system,
            app version, IP address (used for security and abuse prevention), crash
            diagnostics, approximate location derived from IP.</p>
            <p className="mb-2"><strong>Usage data.</strong> Streams watched, gifts sent, follows,
            subscriptions, session timestamps, engagement events used to personalize
            your feed.</p>
            <p className="mb-2"><strong>Payment + subscription data.</strong> When you buy coins or
            subscribe to a creator, we collect transaction identifiers, the amount
            purchased, and the product. Card numbers and full billing details are
            handled by our payment processors — we never see or store them.</p>
            <p className="mb-2"><strong>Camera + microphone.</strong> Accessed only when you explicitly
            start a stream or join a Suite video call. Streams are ephemeral unless
            you opt to save a replay.</p>
          </Section>

          <Section number="2" title="How We Use Information">
            <ul className="list-disc pl-5 space-y-1">
              <li>Operate the service — authenticate you, run livestreams, deliver messages, process purchases.</li>
              <li>Personalize your feed, recommendations, and notifications.</li>
              <li>Process subscriptions, virtual-currency transactions, and creator payouts.</li>
              <li>Keep the platform safe — detect fraud, abuse, spam, CSAM, and policy violations.</li>
              <li>Respond to customer support requests.</li>
              <li>Improve the product (aggregate analytics, bug diagnostics).</li>
              <li>Send transactional email (e.g. password resets). We do not send marketing email without your opt-in.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </Section>

          <Section number="3" title="Legal Bases (EEA/UK users)">
            <p className="mb-2">We process personal data on these legal bases under GDPR/UK GDPR:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Contract</strong> — to provide the Be With Me service you signed up for.</li>
              <li><strong>Legitimate interests</strong> — security, fraud prevention, product improvement, and limited analytics.</li>
              <li><strong>Consent</strong> — for camera/microphone access, optional tracking, and where required by law.</li>
              <li><strong>Legal obligation</strong> — to respond to lawful government requests.</li>
            </ul>
          </Section>

          <Section number="4" title="Third-Party Processors">
            <p className="mb-2">We use the following providers to run the service. Each has its
            own privacy policy governing the data they process on our behalf.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Mux</strong> — live video ingest, HLS playback, replay storage.</li>
              <li><strong>LiveKit</strong> — WebRTC for multi-guest Suite video calls.</li>
              <li><strong>Render</strong> — backend API hosting.</li>
              <li><strong>Vercel</strong> — web frontend hosting.</li>
              <li><strong>Stripe</strong> — web payments and subscription billing.</li>
              <li><strong>Apple</strong> — in-app purchases (iOS) via StoreKit.</li>
              <li><strong>Resend</strong> — transactional email delivery.</li>
              <li><strong>Sentry</strong> — application error monitoring and crash reporting.</li>
              <li><strong>Anthropic / OpenAI</strong> — AI-assisted content moderation and, where enabled, creator analytics.</li>
            </ul>
            <p className="mt-3">We do not sell your personal data to any third party.</p>
          </Section>

          <Section number="5" title="Data Sharing">
            <p className="mb-2">Your account display name, username, avatar, public posts, public
            streams, and chat messages in public streams are visible to other Be
            With Me users. Direct messages are visible only to the participants.</p>
            <p className="mb-2">We share personal information outside the service only:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>With the processors listed in Section 4, strictly as needed to operate the service.</li>
              <li>To comply with valid legal process (subpoena, court order, law enforcement request) — we notify affected users unless prohibited.</li>
              <li>To protect the safety of our users or the public.</li>
              <li>In connection with a corporate transaction (merger, acquisition) — we will update this policy and notify you.</li>
            </ul>
          </Section>

          <Section number="6" title="Data Retention">
            <p className="mb-2">We retain personal data only as long as we need it.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data</strong> — while your account is active. When you delete your account, personal fields (email, username, bio, avatar) are anonymized within 24 hours.</li>
              <li><strong>Live streams</strong> — replays retained for 90 days unless you save or archive.</li>
              <li><strong>Chat messages</strong> — retained with the stream for up to 12 months, then pruned in batches.</li>
              <li><strong>Direct messages</strong> — retained until both participants delete them.</li>
              <li><strong>Payment records</strong> — retained for 7 years for tax and accounting compliance (with PII minimized).</li>
              <li><strong>Security logs</strong> — retained up to 12 months.</li>
            </ul>
          </Section>

          <Section number="7" title="Your Rights">
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
              <li><strong>Correction</strong> — update inaccurate information (you can edit most of this directly in your profile settings).</li>
              <li><strong>Deletion</strong> — delete your account in-app via Profile → Settings → Delete Account, or by emailing us. See Section 8 for details.</li>
              <li><strong>Portability</strong> — request your data in a machine-readable format.</li>
              <li><strong>Object / restrict</strong> — object to processing based on legitimate interest.</li>
              <li><strong>Withdraw consent</strong> — at any time where processing is consent-based.</li>
              <li><strong>Non-discrimination (CCPA)</strong> — we will not penalize you for exercising your rights.</li>
              <li><strong>Complaint</strong> — lodge a complaint with your local data protection authority.</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, email{' '}
              <a href="mailto:stopresolutions1@gmail.com" className="text-brand-600 hover:underline">stopresolutions1@gmail.com</a>.
              We respond within 30 days.
            </p>
          </Section>

          <Section number="8" title="Account Deletion">
            <p className="mb-2">You can delete your account at any time from within the app:
            <strong> Profile → Settings → Delete Account</strong>. When you delete your account:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your email, username, display name, bio, and avatar are anonymized within 24 hours.</li>
              <li>Any active Stripe subscriptions are canceled immediately.</li>
              <li>Your streams are ended, your creator profile is hidden, and follower relationships are removed.</li>
              <li>Content you posted (chat messages, gifts sent) remains visible where required to preserve conversation context for other users, but is attributed to &quot;Deleted user&quot;.</li>
              <li>Payment records may be retained for tax and accounting compliance.</li>
            </ul>
          </Section>

          <Section number="9" title="Security">
            <p>We use industry-standard security measures including TLS/HTTPS for
            all network traffic, encrypted password storage (bcrypt), signed
            webhook verification, rate limiting, and regular security audits. No
            system is perfectly secure; in the event of a breach affecting your
            personal data, we will notify you in accordance with applicable law.</p>
          </Section>

          <Section number="10" title="Age Restriction">
            <p className="mb-2">Be With Me is intended for users <strong>18 and older</strong>. We do
            not knowingly collect personal data from anyone under 18. If you
            believe a child has provided us information, email us at{' '}
            <a href="mailto:stopresolutions1@gmail.com" className="text-brand-600 hover:underline">stopresolutions1@gmail.com</a>{' '}
            and we will delete it promptly.</p>
          </Section>

          <Section number="11" title="International Transfers">
            <p>We are based in the United States and our primary infrastructure is
            hosted in the United States. If you use Be With Me from outside the
            US, your data will be transferred to and processed in the US under
            appropriate safeguards (e.g. Standard Contractual Clauses where
            required).</p>
          </Section>

          <Section number="12" title="Cookies + Local Storage">
            <p className="mb-2">We use first-party cookies and browser localStorage to keep you
            signed in, remember preferences, and operate the service. We do not
            use advertising cookies. On iOS, if we integrate analytics that use
            device identifiers, we first ask for your permission via Apple&apos;s App
            Tracking Transparency prompt.</p>
          </Section>

          <Section number="13" title="California Privacy (CCPA)">
            <p className="mb-2">California residents have additional rights: to know what personal
            information we collect, use, and share; to delete personal
            information; to opt out of any sale or sharing (we do not sell or
            share for cross-context behavioral advertising); and to limit use of
            sensitive personal information. We do not discriminate against users
            who exercise these rights.</p>
          </Section>

          <Section number="14" title="Changes">
            <p>We may update this policy as the service evolves. Material changes
            will be notified in-app and/or by email. Continued use of Be With Me
            after an update means you accept the revised policy.</p>
          </Section>

          <Section number="15" title="Contact">
            <p className="mb-2">Questions, concerns, or requests about this policy?</p>
            <p>
              Be With Me · 1 Stop Resolutions LLC<br />
              Email:{' '}
              <a href="mailto:stopresolutions1@gmail.com" className="text-brand-600 hover:underline">
                stopresolutions1@gmail.com
              </a>
            </p>
          </Section>
        </div>
      </div>
    </Layout>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}
