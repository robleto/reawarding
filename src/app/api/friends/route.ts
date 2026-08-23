import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = friendships ?? [];
  const otherUserIds = Array.from(
    new Set(
      rows
        .map((f: any) => (f.requester_id === user.id ? f.addressee_id : f.requester_id))
        .filter(Boolean)
    )
  );

  let profilesById = new Map<string, any>();
  if (otherUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, preferred_name, full_name, avatar_url')
      .in('id', otherUserIds);

    if (!profilesError && profiles) {
      profilesById = new Map(profiles.map((p: any) => [p.id, p]));
    }
  }

  const enriched = rows.map((f: any) => {
    const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
    return {
      ...f,
      otherProfile: profilesById.get(otherId) ?? null,
      direction: f.requester_id === user.id ? 'outgoing' : 'incoming',
    };
  });

  return NextResponse.json({ friendships: enriched });
}
