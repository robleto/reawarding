import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

/**
 * GET /api/activity
 *
 * Aggregated rating activity from the people the current user follows.
 * Reads `rankings` directly (same pattern as [username]/activity, which
 * shows a single user's own public diary) rather than a separate event-log
 * table — there's no mutation-logging plumbing to keep in sync, and
 * `rankings` already has a public-read policy.
 */
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

  const { data: followRows, error: followError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (followError) {
    return NextResponse.json({ error: followError.message }, { status: 500 });
  }

  const followingIds = (followRows ?? []).map((r) => r.following_id);

  if (followingIds.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const { data: rankingRows, error } = await supabase
    .from('rankings')
    .select('id, user_id, movie_id, seen_it, ranking, updated_at, movies(id, title, release_year, thumb_url)')
    .in('user_id', followingIds)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: any[] = rankingRows ?? [];
  const actorIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));

  const { data: profiles } = actorIds.length
    ? await supabase.from('profiles').select('id, username, preferred_name, full_name, avatar_url').in('id', actorIds)
    : { data: [] as any[] };

  const profilesById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const events = rows.map((r) => ({
    id: r.id,
    actor_id: r.user_id,
    movie_id: r.movie_id,
    seen_it: r.seen_it,
    ranking: r.ranking,
    updated_at: r.updated_at,
    movie: Array.isArray(r.movies) ? r.movies[0] : r.movies,
    actorProfile: profilesById.get(r.user_id) ?? null,
  }));

  return NextResponse.json({ events });
}
