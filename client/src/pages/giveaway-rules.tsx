import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';

export default function GiveawayRules() {
  return (
    <Layout>
      <Head>
        <title>Giveaway Rules - Dress Me</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Giveaway Rules
        </h1>
        <p className="text-sm text-gray-400 mb-10">Last Updated: April 2, 2026</p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <Section title="Important Notice">
            <p>All promotions on Dress Me are classified as Giveaways, not raffles.</p>
          </Section>

          <Section title="No Purchase Necessary">
            <ul className="list-disc pl-5 space-y-1">
              <li>A free method of entry must always be available</li>
              <li>Paid subscriptions may offer additional engagement but do not guarantee winning</li>
            </ul>
          </Section>

          <Section title="Eligibility">
            <ul className="list-disc pl-5 space-y-1">
              <li>Must be 18+</li>
              <li>Must comply with platform rules</li>
            </ul>
          </Section>

          <Section title="Entry Methods">
            <p className="mb-2">Users may enter via:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Subscription participation</li>
              <li>Free entry method (as required by law)</li>
            </ul>
          </Section>

          <Section title="Winner Selection">
            <ul className="list-disc pl-5 space-y-1">
              <li>Winners are selected randomly using a secure system</li>
              <li>Odds depend on number of entries</li>
            </ul>
          </Section>

          <Section title="Prize Description">
            <p className="mb-2">Creators must clearly state:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>What the prize is</li>
              <li>How it is delivered</li>
              <li>Any conditions</li>
            </ul>
          </Section>

          <Section title="Creator Responsibilities">
            <p className="mb-2">Creators running giveaways must:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Follow all applicable laws</li>
              <li>Provide accurate details</li>
              <li>Deliver promised experiences</li>
            </ul>
          </Section>

          <Section title="Platform Disclaimer">
            <p className="mb-2">Dress Me:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Does not guarantee creator giveaways</li>
              <li>Is not liable for disputes between users and creators</li>
            </ul>
          </Section>

          <Section title="Fraud Prevention">
            <p className="mb-2">Any attempt to manipulate results will result in:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Disqualification</li>
              <li>Account suspension</li>
            </ul>
          </Section>

          <Section title="Updates">
            <p>Rules may be updated to remain compliant with laws.</p>
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
