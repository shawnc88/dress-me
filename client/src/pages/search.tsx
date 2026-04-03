import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';
import { SearchPage } from '@/features/search/SearchPage';

export default function SearchRoute() {
  return (
    <Layout>
      <Head>
        <title>Search - Dress Me</title>
      </Head>
      <SearchPage />
    </Layout>
  );
}
