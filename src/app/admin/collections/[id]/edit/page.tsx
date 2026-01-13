import { isUserAdmin } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import CollectionForm from '../CollectionForm';

export const dynamic = 'force-dynamic';

export default async function EditCollectionPage({
  params,
}: {
  params: { id: string };
}) {
  const isAdmin = await isUserAdmin();

  if (!isAdmin) {
    redirect('/admin/unauthorized');
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: collection } = await supabase
    .from('film_collections')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!collection) {
    redirect('/admin/collections');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <CollectionForm mode="edit" collection={collection} />
      </div>
    </div>
  );
}
