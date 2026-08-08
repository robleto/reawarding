import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Deletes everything listed under "What Gets Deleted" in
// src/app/legal/data-deletion/page.tsx. Rows are removed explicitly (rather
// than relying solely on auth.users FK cascades) so this works regardless of
// whether a given table's cascade is actually wired up in this environment.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = user.id;

  const { data: ownedLists } = await supabaseAdmin
    .from('movie_lists')
    .select('id')
    .eq('user_id', userId);
  const ownedListIds = (ownedLists ?? []).map((l) => l.id);

  if (ownedListIds.length > 0) {
    await supabaseAdmin.from('movie_list_items').delete().in('list_id', ownedListIds);
  }
  await supabaseAdmin.from('movie_lists').delete().eq('user_id', userId);
  await supabaseAdmin.from('movie_reviews').delete().eq('user_id', userId);
  await supabaseAdmin.from('rankings').delete().eq('user_id', userId);
  await supabaseAdmin.from('expressions').delete().eq('user_id', userId);
  await supabaseAdmin.from('activity_events').delete().eq('actor_id', userId);
  await supabaseAdmin
    .from('follows')
    .delete()
    .or(`follower_id.eq.${userId},following_id.eq.${userId}`);
  await supabaseAdmin
    .from('user_follows')
    .delete()
    .or(`follower_id.eq.${userId},following_id.eq.${userId}`);
  await supabaseAdmin
    .from('friendships')
    .delete()
    .or(
      `requester_id.eq.${userId},addressee_id.eq.${userId},user_high.eq.${userId},user_low.eq.${userId}`
    );
  await supabaseAdmin.from('profiles').delete().eq('id', userId);

  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
