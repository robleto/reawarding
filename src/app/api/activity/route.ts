import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);

  const limitParam = Number(searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: events, error } = await supabase
    .from('activity_events')
    .select('id, actor_id, event_type, movie_id, list_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: any[] = events ?? [];

  const actorIds = Array.from(new Set(rows.map((e) => e.actor_id).filter(Boolean)));
  const movieIds = Array.from(new Set(rows.map((e) => e.movie_id).filter(Boolean)));
  const listIds = Array.from(new Set(rows.map((e) => e.list_id).filter(Boolean)));

  const [profilesRes, moviesRes, listsRes] = await Promise.all([
    actorIds.length
      ? supabase.from('profiles').select('id, username, preferred_name, full_name, avatar_url').in('id', actorIds)
      : Promise.resolve({ data: [], error: null } as any),
    movieIds.length
      ? supabase.from('movies').select('id, title, release_year').in('id', movieIds)
      : Promise.resolve({ data: [], error: null } as any),
    listIds.length
      ? supabase.from('movie_lists').select('id, name').in('id', listIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const profilesById = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
  const moviesById = new Map((moviesRes.data ?? []).map((m: any) => [m.id, m]));
  const listsById = new Map((listsRes.data ?? []).map((l: any) => [l.id, l]));

  const enriched = rows.map((e) => ({
    ...e,
    actorProfile: profilesById.get(e.actor_id) ?? null,
    movie: e.movie_id ? moviesById.get(e.movie_id) ?? null : null,
    list: e.list_id ? listsById.get(e.list_id) ?? null : null,
  }));

  return NextResponse.json({ events: enriched });
}
