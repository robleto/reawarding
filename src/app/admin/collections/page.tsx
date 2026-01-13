import { isUserAdmin } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import CollectionsManager from './CollectionsManager';

export const dynamic = 'force-dynamic';

export default async function AdminCollectionsPage() {
  const isAdmin = await isUserAdmin();

  if (!isAdmin) {
    redirect('/admin/unauthorized');
  }

  return <CollectionsManager />;
}
