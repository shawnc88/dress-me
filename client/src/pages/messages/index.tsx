import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';
import { MessagesInboxPanel } from '@/components/messages/MessagesInboxPanel';

/**
 * /messages route — the inbox as its own page. The same inbox also lives as
 * the left-hand panel of the home pager (swipe right on the feed); the shared
 * surface is MessagesInboxPanel.
 */
export default function MessagesInbox() {
  return (
    <Layout>
      <Head><title>Messages - Be With Me</title></Head>
      <MessagesInboxPanel />
    </Layout>
  );
}
