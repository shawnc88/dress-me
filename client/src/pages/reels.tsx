import Head from 'next/head';
import dynamic from 'next/dynamic';

const ReelFeed = dynamic(
  () => import('@/features/reels/ReelFeed').then(m => m.ReelFeed),
  {
    ssr: false,
    // Branded skeleton instead of a blank black frame while the chunk loads.
    loading: () => (
      <div className="fixed inset-0 celebration-canvas flex items-center justify-center">
        <div className="h-9 w-9 rounded-full border-2 border-white/25 border-t-transparent animate-spin" />
      </div>
    ),
  }
);

export default function ReelsPage() {
  return (
    <>
      <Head>
        <title>Reels - Be With Me</title>
      </Head>
      <ReelFeed />
    </>
  );
}
