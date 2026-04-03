import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';
import { NotificationSettings } from '@/features/growth/NotificationSettings';

export default function NotificationSettingsPage() {
  return (
    <Layout>
      <Head>
        <title>Notification Settings - Dress Me</title>
      </Head>
      <div className="max-w-[630px] mx-auto px-4 py-8">
        <NotificationSettings />
      </div>
    </Layout>
  );
}
