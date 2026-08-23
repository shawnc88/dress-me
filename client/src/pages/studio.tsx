import Head from 'next/head';
import { StudioHub } from '@/components/studio/StudioHub';

/**
 * /studio route — the create hub as its own page (reached from the tab bar's
 * center Create button and deep links). The same hub also lives as the
 * right-hand panel of the home pager; the shared surface is StudioHub.
 */
export default function Studio() {
  return (
    <>
      <Head><title>Create - Be With Me</title></Head>
      <div className="fixed inset-0">
        <StudioHub />
      </div>
    </>
  );
}
