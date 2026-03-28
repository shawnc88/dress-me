import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LiveNowRow } from '@/components/feed/LiveNowRow';
import { StreamFeedCard } from '@/components/feed/StreamFeedCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [recentStreams, setRecentStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function safeFetch(url: string) {
      const res = await fetch(url);
      if (!res.ok) return { streams: [] };
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { streams: [] }; }
    }

    Promise.all([
      safeFetch(`${API_URL}/api/streams?status=LIVE&limit=20`),
      safeFetch(`${API_URL}/api/streams?status=SCHEDULED&limit=10`),
    ])
      .then(([live, scheduled]) => {
        setLiveStreams(live.streams || []);
        setRecentStreams(scheduled.streams || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasContent = liveStreams.length > 0 || recentStreams.length > 0;

  return (
    <Layout>
      <Head>
        <title>Dress Me - Live Fashion Streaming</title>
        <meta name="description" content="Watch fashion creators style outfits live. Interactive polls, exclusive giveaways, and shoppable streams." />
      </Head>

      {/* Hero — only show when no live content */}
      {!loading && !hasContent && (
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-purple-900" />
          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6">
              Fashion Comes Alive
            </h1>
            <p className="text-xl md:text-2xl text-brand-100 mb-10 leading-relaxed">
              Watch creators style outfits in real-time. Vote on looks, send gifts,
              and shop what you see — all in one stream.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4">
                Join Free
              </Link>
              <Link href="/streams" className="btn-secondary text-lg px-8 py-4 !bg-white/10 !text-white hover:!bg-white/20">
                Browse Streams
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Feed — Instagram/BIGO style */}
      {!loading && hasContent && (
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Live Now Row (Instagram Stories style) */}
          <LiveNowRow streams={liveStreams} />

          {/* Feed Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">For You</h2>
            <Link href="/streams" className="text-sm text-brand-600 font-medium hover:underline">
              See All
            </Link>
          </div>

          {/* Stream Feed Grid — vertical cards on mobile, grid on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...liveStreams, ...recentStreams].map((stream) => (
              <StreamFeedCard key={stream.id} stream={stream} />
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading feed...</div>
        </div>
      )}

      {/* Features — always show below feed */}
      <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-16">
            Why Dress Me?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard icon="🎬" title="Live Dressing Rooms" description="Watch creators style outfits in real-time with vertical, mobile-first video." />
            <FeatureCard icon="🧵" title="Threads Economy" description="Send gifts, unlock exclusive content, and support your favorite creators." />
            <FeatureCard icon="🎁" title="Weekly Giveaways" description="Enter giveaways for free. No purchase necessary — always a free entry." />
            <FeatureCard icon="🛍️" title="Shop the Stream" description="See something you love? Tap to buy directly from the stream." />
            <FeatureCard icon="👑" title="VIP Access" description="Elite members get 1-on-1 styling, exclusive drops, and voting rights." />
            <FeatureCard icon="🤖" title="AI Styling" description="Personalized outfit recommendations powered by AI, with a human touch." />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-4">
            Choose Your Experience
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-xl mx-auto">
            From casual viewer to VIP insider — pick the tier that fits your style.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <TierCard tier="Basic" price="$9.99" badge="badge-basic" features={['Public live streams', 'Standard chat', 'Limited replays', 'Community badges', 'Exclusive polls']} />
            <TierCard tier="Premium" price="$24.99" badge="badge-premium" featured features={['Everything in Basic', 'Weekly styling classes', 'Private community', 'Early merch access', 'Priority support']} />
            <TierCard tier="Elite" price="$49.99" badge="badge-elite" features={['Everything in Premium', '1-on-1 styling sessions', 'Exclusive merch drops', 'Design voting rights', 'Dynamic VIP pricing']} />
          </div>
        </div>
      </section>
    </Layout>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="card p-8 text-center hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function TierCard({ tier, price, badge, features, featured }: { tier: string; price: string; badge: string; features: string[]; featured?: boolean }) {
  return (
    <div className={`card p-8 ${featured ? 'ring-2 ring-brand-500 scale-105' : ''}`}>
      <span className={badge}>{tier}</span>
      <div className="mt-4 mb-6">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-gray-500">/month</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <span className="text-brand-500">✓</span> {f}
          </li>
        ))}
      </ul>
      <Link href="/auth/signup" className={featured ? 'btn-primary w-full text-center block' : 'btn-secondary w-full text-center block'}>
        Get Started
      </Link>
    </div>
  );
}
