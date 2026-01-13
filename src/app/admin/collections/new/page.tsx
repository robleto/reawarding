import { isUserAdmin } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import CollectionForm from '../[id]/CollectionForm';

export const dynamic = 'force-dynamic';

export default async function NewCollectionPage() {
  const isAdmin = await isUserAdmin();

  if (!isAdmin) {
    redirect('/admin/unauthorized');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <CollectionForm mode="create" />
      </div>
    </div>
  );
}
