import Head from 'next/head';
import dynamic from 'next/dynamic';

const ReelFeed = dynamic(
  () => import('@/features/reels/ReelFeed').then(m => m.ReelFeed),
  { ssr: false }
);

export default function ReelsPage() {
  return (
    <>
      <Head>
        <title>Reels - Dress Me</title>
      </Head>
      <ReelFeed />
    </>
  );
}
