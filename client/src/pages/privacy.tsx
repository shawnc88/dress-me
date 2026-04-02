import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';

export default function Privacy() {
  return (
    <Layout>
      <Head>
        <title>Privacy Policy - Dress Me</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-400 mb-10">Last Updated: April 2, 2026</p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <Section number="1" title="Information We Collect">
            <p className="mb-2">We collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account info (email, username)</li>
              <li>Usage data (interactions, streams)</li>
              <li>Device and browser data</li>
              <li>Camera/audio access (only when you go live)</li>
            </ul>
          </Section>

          <Section number="2" title="How We Use Information">
            <p className="mb-2">We use data to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operate the platform</li>
              <li>Improve user experience</li>
              <li>Provide support</li>
              <li>Ensure safety and moderation</li>
            </ul>
          </Section>

          <Section number="3" title="Third-Party Services">
            <p className="mb-2">We use trusted providers including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mux (video streaming)</li>
              <li>LiveKit (real-time communication)</li>
              <li>Hosting services (Render, Vercel)</li>
            </ul>
            <p className="mt-2">These services may process limited user data.</p>
          </Section>

          <Section number="4" title="Cookies & Tracking">
            <p className="mb-2">We may use cookies to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintain sessions</li>
              <li>Improve performance</li>
              <li>Analyze usage</li>
            </ul>
          </Section>

          <Section number="5" title="Data Sharing">
            <p className="mb-2">We do NOT sell user data.</p>
            <p className="mb-2">We may share data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>With service providers</li>
              <li>If required by law</li>
            </ul>
          </Section>

          <Section number="6" title="Data Security">
            <p>
              We implement reasonable security measures but cannot guarantee absolute security.
            </p>
          </Section>

          <Section number="7" title="Your Rights">
            <p className="mb-2">You may:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Request deletion of your account</li>
              <li>Request access to your data</li>
            </ul>
          </Section>

          <Section number="8" title="Children's Privacy">
            <p>This platform is NOT intended for users under 18.</p>
          </Section>

          <Section number="9" title="Changes">
            <p>We may update this policy at any time.</p>
          </Section>

          <Section number="10" title="Contact">
            <p>
              For questions about this Privacy Policy, contact us at{' '}
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
