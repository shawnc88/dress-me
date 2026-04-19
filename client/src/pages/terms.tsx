import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';

export default function Terms() {
  return (
    <Layout>
      <Head>
        <title>Terms of Service · Be With Me</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-400 mb-10">Effective Date: April 19, 2026 · Last Updated: April 19, 2026</p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <p>
            These Terms of Service (&quot;Terms&quot;) are a binding agreement between
            you and <strong>1 Stop Resolutions LLC</strong> (d/b/a Be With Me) (&quot;we&quot;,
            &quot;us&quot;, &quot;our&quot;) governing your use of the Be With Me live-streaming
            service at bewithme.live and the Be With Me iOS app (together, the
            &quot;Service&quot;). By creating an account or using the Service you agree
            to these Terms. If you do not agree, do not use the Service.
          </p>

          <Section number="1" title="Eligibility">
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be at least <strong>18 years old</strong>. We do not knowingly allow minors on the Service.</li>
              <li>You must provide accurate, complete registration information and keep it current.</li>
              <li>You must not be barred from using the Service under any applicable law or by a prior account termination.</li>
              <li>One account per person. You are responsible for activity under your account and for keeping your password secure.</li>
            </ul>
          </Section>

          <Section number="2" title="The Service">
            <p className="mb-2">Be With Me lets creators broadcast live fashion + lifestyle
            streams and interact with viewers through chat, gifts, subscriptions,
            reels, stories, direct messages, and Suite multi-guest video. We may
            add, change, or remove features at any time.</p>
            <p>The Service relies on third-party infrastructure (Mux, LiveKit,
            Stripe, Apple App Store, Render, Vercel, Resend, Sentry). Outages or
            changes by those providers may affect availability.</p>
          </Section>

          <Section number="3" title="Account Registration + Security">
            <ul className="list-disc pl-5 space-y-1">
              <li>You must keep your login credentials confidential and immediately notify us of any unauthorized use.</li>
              <li>We may suspend or terminate an account at any time for violations of these Terms or for behavior that endangers other users or the Service.</li>
              <li>You can delete your account at any time via Profile → Settings → Delete Account. Deletion anonymizes your profile within 24 hours (see our Privacy Policy).</li>
            </ul>
          </Section>

          <Section number="4" title="User-Generated Content">
            <p className="mb-2">&quot;User Content&quot; means everything you upload, post, stream,
            message, or otherwise make available on the Service (videos, photos,
            chat messages, reels, stories, posts, profile info, etc.).</p>
            <p className="mb-2">You retain ownership of your User Content. You grant us a
            worldwide, non-exclusive, royalty-free, transferable license to host,
            store, reproduce, modify (e.g. reformat/transcode for delivery),
            distribute, display, and perform your User Content solely for the
            purpose of operating, promoting, and improving the Service. This
            license ends when you or we delete the content, except where we must
            retain it by law or for legitimate safety/fraud investigations.</p>
            <p>You represent that you own or have the rights to the User Content
            you submit, and that it does not violate any third-party rights or
            applicable law.</p>
          </Section>

          <Section number="5" title="Acceptable Use">
            <p className="mb-2">You agree <strong>not</strong> to use the Service to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Post, stream, or share illegal content, including child sexual abuse material (CSAM), human trafficking, drugs, firearms, or fraud.</li>
              <li>Engage in harassment, threats, bullying, doxxing, or hate speech targeting protected groups (race, religion, national origin, gender, sexual orientation, gender identity, disability).</li>
              <li>Share explicit sexual content, nudity, or intimate content of others without consent.</li>
              <li>Impersonate another person or misrepresent your affiliation.</li>
              <li>Record, capture, or distribute another user&apos;s private stream, call, or message without their explicit consent.</li>
              <li>Spam, mass-promote, run bots or automated accounts, or manipulate engagement metrics.</li>
              <li>Reverse-engineer, decompile, or probe the Service for security vulnerabilities outside a coordinated disclosure program.</li>
              <li>Circumvent rate limits, content filters, age gates, or account suspensions.</li>
              <li>Use the Service to transmit malware or to attack other systems.</li>
            </ul>
            <p className="mt-2">Our full <a href="/safety" className="text-brand-600 hover:underline">Content + Safety Policy</a> is part of these Terms by reference.</p>
          </Section>

          <Section number="6" title="Purchases, Virtual Currency, + Subscriptions">
            <p className="mb-2"><strong>Threads (virtual currency).</strong> Threads are a
            non-refundable, non-transferable virtual currency used to send gifts
            to creators inside the Service. Threads have no cash value, cannot be
            exchanged back for real money by users, and expire if your account is
            terminated for a violation. Thread balances don&apos;t accrue interest.</p>
            <p className="mb-2"><strong>Creator subscriptions.</strong> You may subscribe to a
            creator at published tier prices (Supporter / VIP / Inner Circle). Subs
            auto-renew monthly or yearly until canceled. Canceling stops renewal
            but does not refund the current period. You can cancel at any time in
            app settings (iOS: Settings → Subscriptions on your device).</p>
            <p className="mb-2"><strong>Payment processors.</strong> On iOS, purchases are
            processed by Apple via In-App Purchase, subject to Apple&apos;s terms. On
            web, payments are processed by Stripe. We do not store full card
            details.</p>
            <p className="mb-2"><strong>Platform fee.</strong> We retain a platform fee (currently 20%)
            on creator subscription revenue. Creator payouts are subject to
            applicable taxes and Stripe processing schedules.</p>
            <p><strong>Refunds.</strong> Digital purchases are generally non-refundable
            once delivered. iOS refund requests must be submitted through Apple.
            For Stripe web purchases, email{' '}
            <a href="mailto:stopresolutions1@gmail.com" className="text-brand-600 hover:underline">stopresolutions1@gmail.com</a>{' '}
            within 7 days and we&apos;ll review on a case-by-case basis.</p>
          </Section>

          <Section number="7" title="Creator Terms">
            <p className="mb-2">If you create content on Be With Me:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are an independent content creator, not our employee, agent, or partner.</li>
              <li>You are responsible for all taxes on earnings you receive.</li>
              <li>You must comply with these Terms and the Content + Safety Policy. Severe or repeat violations may forfeit accrued earnings, at our reasonable discretion and consistent with law.</li>
              <li>Payouts go through Stripe Connect or Apple&apos;s payout mechanism; you must complete required KYC / tax forms before funds are released.</li>
              <li>You own your content and audience relationships. We don&apos;t claim exclusivity.</li>
            </ul>
          </Section>

          <Section number="8" title="Livestreams + Recordings">
            <p className="mb-2">Live streams and Suite video calls may be recorded,
            stored as replays, and re-served. Participants consent to being
            recorded when they join. Creators are responsible for any additional
            consent required under local law if their stream features other
            identifiable people.</p>
          </Section>

          <Section number="9" title="Giveaways + Promotions">
            <ul className="list-disc pl-5 space-y-1">
              <li>Creator-run giveaways and raffles must comply with applicable sweepstakes + consumer-protection laws. We are not the operator or sponsor of creator giveaways.</li>
              <li>Where legally required, no purchase is necessary to enter.</li>
              <li>Winners are selected by the creator&apos;s stated method (random, weighted, etc.).</li>
            </ul>
          </Section>

          <Section number="10" title="Intellectual Property">
            <p className="mb-2">The Service itself (code, design, trademarks, logos, and
            our original content) is owned by us and protected by copyright and
            trademark law. Nothing in these Terms grants you any right in our
            intellectual property other than a limited, revocable license to use
            the Service as intended.</p>
            <p className="mb-2"><strong>DMCA / copyright complaints.</strong> If you believe content
            on the Service infringes your copyright, email our designated agent
            at{' '}
            <a href="mailto:stopresolutions1@gmail.com" className="text-brand-600 hover:underline">stopresolutions1@gmail.com</a>{' '}
            with: (a) identification of the copyrighted work, (b) identification
            of the infringing material with URL, (c) your contact information,
            (d) a statement of good-faith belief, (e) a statement under penalty
            of perjury that you are authorized to act, and (f) your signature.
            We respond to valid DMCA notices and process counter-notices under 17
            U.S.C. § 512.</p>
          </Section>

          <Section number="11" title="Content Moderation + Enforcement">
            <p className="mb-2">We use a combination of automated tools (AI
            classification) and human review to enforce these Terms. We may, at
            our sole and reasonable discretion:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Remove content or end a live stream.</li>
              <li>Warn, restrict, suspend, or permanently ban accounts.</li>
              <li>Withhold or revoke virtual-currency balances tied to violations.</li>
              <li>Report illegal activity to law enforcement and preserve evidence.</li>
              <li>Cooperate with subpoenas, court orders, and lawful requests.</li>
            </ul>
            <p className="mt-2">You can appeal a suspension by emailing{' '}
            <a href="mailto:stopresolutions1@gmail.com" className="text-brand-600 hover:underline">stopresolutions1@gmail.com</a>{' '}
            within 30 days of the action.</p>
          </Section>

          <Section number="12" title="Third-Party Services">
            <p>The Service integrates with third-party services including Apple
            App Store, Stripe, Mux, LiveKit, Resend, and Sentry. Your use of
            those services is governed by their own terms and privacy
            policies. We aren&apos;t responsible for their availability or actions.</p>
          </Section>

          <Section number="13" title="Disclaimers">
            <p className="mb-2">THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
            WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT
            LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
            PURPOSE, NON-INFRINGEMENT, AND QUIET ENJOYMENT. WE DO NOT WARRANT
            THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.</p>
          </Section>

          <Section number="14" title="Limitation of Liability">
            <p className="mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING
            FROM YOUR USE OF THE SERVICE.</p>
            <p>OUR AGGREGATE LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATED TO
            THESE TERMS OR THE SERVICE IS LIMITED TO THE GREATER OF (A) THE
            AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM AROSE, OR (B)
            US$100.</p>
          </Section>

          <Section number="15" title="Indemnification">
            <p>You will indemnify and hold harmless Be With Me, 1 Stop Resolutions
            LLC, and our officers, employees, and agents from any claims,
            liabilities, damages, losses, and expenses (including reasonable
            attorneys&apos; fees) arising out of (a) your use of the Service, (b)
            your User Content, (c) your violation of these Terms, or (d) your
            violation of any third-party right.</p>
          </Section>

          <Section number="16" title="Dispute Resolution + Governing Law">
            <p className="mb-2">These Terms are governed by the laws of the state where
            1 Stop Resolutions LLC is organized, without regard to conflict-of-law
            rules. Any dispute must be filed in the state or federal courts
            located there, and you consent to that jurisdiction and venue.</p>
            <p>Informal resolution first: before filing, email us at{' '}
            <a href="mailto:stopresolutions1@gmail.com" className="text-brand-600 hover:underline">stopresolutions1@gmail.com</a>{' '}
            and give us 30 days to resolve the issue in good faith.</p>
          </Section>

          <Section number="17" title="Changes to Terms">
            <p>We may update these Terms as the Service evolves. Material changes
            will be posted in-app and/or emailed to you with at least 14 days&apos;
            notice before they take effect. Continued use after the effective date
            means you accept the updated Terms.</p>
          </Section>

          <Section number="18" title="Miscellaneous">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Entire agreement:</strong> These Terms + our Privacy Policy + Safety Policy are the full agreement between you and us about the Service.</li>
              <li><strong>Severability:</strong> If a provision is found unenforceable, the rest of the Terms remain in effect.</li>
              <li><strong>No waiver:</strong> Failure to enforce a provision is not a waiver.</li>
              <li><strong>Assignment:</strong> You may not assign these Terms. We may assign them to an affiliate or a successor entity.</li>
              <li><strong>Notices:</strong> Legal notices to us must go to <a href="mailto:stopresolutions1@gmail.com" className="text-brand-600 hover:underline">stopresolutions1@gmail.com</a>.</li>
            </ul>
          </Section>

          <Section number="19" title="Contact">
            <p>
              1 Stop Resolutions LLC (d/b/a Be With Me)<br />
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
