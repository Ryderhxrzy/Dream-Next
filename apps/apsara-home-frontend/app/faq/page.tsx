import { buildPageMetadata } from '@/app/seo';
import FaqPageClient from '@/components/faq/FaqPageClient';
import { getNavbarCategories } from '@/libs/serverStorefront';

export const metadata = buildPageMetadata({
  title: 'FAQ',
  description: 'Frequently Asked Questions about AF Home - Orders, payments, shipping, returns, and more.',
  path: '/faq',
});

export default async function FaqPage() {
  const navbarCategories = await getNavbarCategories()
  return <FaqPageClient initialCategories={navbarCategories} />;
}