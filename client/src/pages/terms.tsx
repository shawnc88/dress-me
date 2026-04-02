import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';

export default function Terms() {
  return (
    <Layout>
      <Head>
        <title>Terms of Service - Dress Me</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-400 mb-10">Last Updated: April 2, 2026</p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <Section number="1" title="Acceptance of Terms">
            <p>
              By accessing or using the Dress Me platform (&quot;Service&quot;), you agree to be bound by these Terms.
              If you do not agree, do not use the Service.
            </p>
          </Section>

          <Section number="2" title="Description of Service">
            <p>
              Dress Me is a live-streaming social platform where creators broadcast content and interact with
              subscribers through live sessions and community features.
            </p>
          </Section>

          <Section number="3" title="User Accounts">
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining account security.</li>
              <li>You must be at least 18 years old to use this platform.</li>
            </ul>
          </Section>

          <Section number="4" title="Creator Responsibilities">
            <p className="mb-2">Creators agree:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To comply with all applicable laws</li>
              <li>Not to stream illegal, harmful, or prohibited content</li>
              <li>To respect community guidelines</li>
              <li>That Dress Me may remove content or suspend accounts at its discretion</li>
            </ul>
          </Section>

          <Section number="5" title="Prohibited Content">
            <p className="mb-2">You may NOT:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Post or stream illegal content</li>
              <li>Engage in harassment, hate speech, or abuse</li>
              <li>Share explicit or non-consensual material</li>
              <li>Impersonate others</li>
            </ul>
          </Section>

          <Section number="6" title="Live Streaming Rules">
            <ul className="list-disc pl-5 space-y-1">
              <li>All live sessions must comply with platform policies</li>
              <li>Dress Me reserves the right to terminate streams at any time</li>
              <li>Participation in live sessions may be recorded</li>
            </ul>
          </Section>

          <Section number="7" title="Giveaways & Promotions">
            <ul className="list-disc pl-5 space-y-1">
              <li>All giveaways must follow official platform rules</li>
              <li>No purchase is necessary to enter (where required by law)</li>
              <li>Winners are selected randomly</li>
              <li>Dress Me is not responsible for creator-run promotions</li>
            </ul>
          </Section>

          <Section number="8" title="Termination">
            <p>We may suspend or terminate accounts for violations without notice.</p>
          </Section>

          <Section number="9" title="Limitation of Liability">
            <p className="mb-2">Dress Me is not responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>User-generated content</li>
              <li>Losses resulting from platform use</li>
              <li>Technical interruptions</li>
            </ul>
          </Section>

          <Section number="10" title="Changes to Terms">
            <p>We may update these Terms at any time. Continued use means acceptance.</p>
          </Section>

          <Section number="11" title="Contact">
            <p>
              For questions about these Terms, contact us at{' '}
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
