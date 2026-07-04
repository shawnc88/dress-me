import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';
import { ScrollText } from 'lucide-react';

export default function GiveawayRules() {
  return (
    <Layout>
      <Head>
        <title>Giveaway Rules - Be With Me</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-12 pb-24 safe-area-pb">
        {/* ─── Slim celebration header — a hint of party, then all legibility ─── */}
        <div className="relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 shadow-couture px-6 py-8 mb-8 animate-rise">
          <div
            className="pointer-events-none absolute top-0 inset-x-8 h-px bg-gradient-to-r from-accent-amber/50 via-brand-500/50 to-accent-cyan/50"
            aria-hidden
          />
          <div className="relative z-[2] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl neon-hairline flex items-center justify-center flex-shrink-0 pointer-events-none" aria-hidden>
              <ScrollText className="w-5 h-5 text-accent-amber" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-amber/80 mb-1.5">
                The fine print
              </p>
              <h1 className="font-extrabold tracking-tight text-3xl md:text-4xl text-white leading-[1.05]">
                Giveaway <span className="text-celebration">Rules</span>
              </h1>
              <p className="text-sm text-white/40 mt-1.5">Last Updated: April 2, 2026</p>
            </div>
          </div>
        </div>

        {/* ─── Glass content card — high-contrast, readable, calm ─── */}
        <div className="glass-couture px-6 py-8 md:px-8">
          <div className="space-y-8 text-white/75 text-sm leading-relaxed">
            <Section title="Important Notice">
              <p>All promotions on Be With Me are classified as Giveaways, not raffles.</p>
            </Section>

            <Section title="No Purchase Necessary">
              <ul className="list-disc pl-5 space-y-1 marker:text-accent-green/70">
                <li>A free method of entry must always be available</li>
                <li>Paid subscriptions may offer additional engagement but do not guarantee winning</li>
              </ul>
            </Section>

            <Section title="Eligibility">
              <ul className="list-disc pl-5 space-y-1 marker:text-accent-green/70">
                <li>Must be 18+</li>
                <li>Must comply with platform rules</li>
              </ul>
            </Section>

            <Section title="Entry Methods">
              <p className="mb-2">Users may enter via:</p>
              <ul className="list-disc pl-5 space-y-1 marker:text-accent-green/70">
                <li>Subscription participation</li>
                <li>Free entry method (as required by law)</li>
              </ul>
            </Section>

            <Section title="Winner Selection">
              <ul className="list-disc pl-5 space-y-1 marker:text-accent-green/70">
                <li>Winners are selected randomly using a secure system</li>
                <li>Odds depend on number of entries</li>
              </ul>
            </Section>

            <Section title="Prize Description">
              <p className="mb-2">Creators must clearly state:</p>
              <ul className="list-disc pl-5 space-y-1 marker:text-accent-green/70">
                <li>What the prize is</li>
                <li>How it is delivered</li>
                <li>Any conditions</li>
              </ul>
            </Section>

            <Section title="Creator Responsibilities">
              <p className="mb-2">Creators running giveaways must:</p>
              <ul className="list-disc pl-5 space-y-1 marker:text-accent-green/70">
                <li>Follow all applicable laws</li>
                <li>Provide accurate details</li>
                <li>Deliver promised experiences</li>
              </ul>
            </Section>

            <Section title="Platform Disclaimer">
              <p className="mb-2">Be With Me:</p>
              <ul className="list-disc pl-5 space-y-1 marker:text-accent-green/70">
                <li>Does not guarantee creator giveaways</li>
                <li>Is not liable for disputes between users and creators</li>
              </ul>
            </Section>

            <Section title="Fraud Prevention">
              <p className="mb-2">Any attempt to manipulate results will result in:</p>
              <ul className="list-disc pl-5 space-y-1 marker:text-accent-green/70">
                <li>Disqualification</li>
                <li>Account suspension</li>
              </ul>
            </Section>

            <Section title="Updates">
              <p>Rules may be updated to remain compliant with laws.</p>
            </Section>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="relative pl-4">
      {/* Accent spine — colorful marker without touching text contrast */}
      <span
        className="pointer-events-none absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-gradient-to-b from-accent-amber/70 via-brand-500/50 to-transparent"
        aria-hidden
      />
      <h2 className="text-lg font-bold tracking-tight text-white mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}
