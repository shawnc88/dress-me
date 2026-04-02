import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';

export default function Safety() {
  return (
    <Layout>
      <Head>
        <title>Content & Safety Policy - Dress Me</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Content & Safety Policy
        </h1>
        <p className="text-sm text-gray-400 mb-10">Last Updated: April 2, 2026</p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <Section title="Our Mission">
            <p>We aim to create a safe, engaging, and respectful live-streaming environment.</p>
          </Section>

          <Section title="Allowed Content">
            <ul className="list-disc pl-5 space-y-1">
              <li>Fashion, styling, lifestyle streams</li>
              <li>Interactive live sessions</li>
              <li>Community engagement</li>
            </ul>
          </Section>

          <Section title="Prohibited Content">
            <ul className="list-disc pl-5 space-y-1">
              <li>Nudity or explicit sexual content</li>
              <li>Illegal activity</li>
              <li>Harassment or hate speech</li>
              <li>Violence or dangerous acts</li>
              <li>Non-consensual recording</li>
            </ul>
          </Section>

          <Section title="Live Stream Rules">
            <ul className="list-disc pl-5 space-y-1">
              <li>Creators must maintain appropriate conduct</li>
              <li>Streams may be monitored or reviewed</li>
              <li>Violations may result in immediate shutdown</li>
            </ul>
          </Section>

          <Section title="Reporting System">
            <p className="mb-2">Users can:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Report streams</li>
              <li>Report users</li>
              <li>Flag inappropriate content</li>
            </ul>
          </Section>

          <Section title="Enforcement">
            <p className="mb-2">We may:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Remove content</li>
              <li>Suspend accounts</li>
              <li>Ban users permanently</li>
            </ul>
          </Section>

          <Section title="Safety Measures">
            <ul className="list-disc pl-5 space-y-1">
              <li>Moderation tools (AI + manual)</li>
              <li>User reporting system</li>
              <li>Content review processes</li>
            </ul>
          </Section>

          <Section title="Creator Accountability">
            <p className="mb-2">Creators are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Their content</li>
              <li>Their audience interactions</li>
              <li>Compliance with all laws</li>
            </ul>
          </Section>

          <Section title="Updates">
            <p>This policy may evolve as the platform grows.</p>
          </Section>
        </div>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}
