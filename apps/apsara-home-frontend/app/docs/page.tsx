import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { adminAuthOptions } from '@/libs/adminAuth';
import Docs from '@/components/Docs';

export const metadata = {
  title: 'AF Home — System Documentation',
  description: 'Architecture, code standards, integrations, and workflow rules for the AF Home platform.',
};

// Session-gated, so it must never be statically rendered.
export const dynamic = 'force-dynamic';

export default async function DocsPage() {
  const session = await getServerSession(adminAuthOptions);

  // Only signed-in admins may view the system documentation.
  if (!session?.user) {
    redirect('/admin/login?callbackUrl=/docs');
  }

  return <Docs />;
}
