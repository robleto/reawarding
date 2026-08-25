-- Public participation leaderboard (computed)

CREATE OR REPLACE FUNCTION public.get_participation_leaderboard(limit_count integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  username text,
  preferred_name text,
  avatar_url text,
  rankings_count integer,
  lists_count integer,
  list_items_count integer,
  score integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
    rankings_agg AS (
      SELECT r.user_id, COUNT(*)::int AS rankings_count
      FROM public.rankings r
      GROUP BY r.user_id
    ),
    lists_agg AS (
      SELECT ml.user_id, COUNT(*)::int AS lists_count
      FROM public.movie_lists ml
      GROUP BY ml.user_id
    ),
    list_items_agg AS (
      SELECT ml.user_id, COUNT(*)::int AS list_items_count
      FROM public.movie_list_items mli
      JOIN public.movie_lists ml ON ml.id = mli.list_id
      GROUP BY ml.user_id
    )
  SELECT
    p.id AS user_id,
    p.username,
    p.preferred_name,
    p.avatar_url,
    COALESCE(r.rankings_count, 0) AS rankings_count,
    COALESCE(l.lists_count, 0) AS lists_count,
    COALESCE(li.list_items_count, 0) AS list_items_count,
    (
      COALESCE(r.rankings_count, 0) * 2
      + COALESCE(l.lists_count, 0) * 5
      + COALESCE(li.list_items_count, 0) * 1
    )::int AS score
  FROM public.profiles p
  LEFT JOIN rankings_agg r ON r.user_id = p.id
  LEFT JOIN lists_agg l ON l.user_id = p.id
  LEFT JOIN list_items_agg li ON li.user_id = p.id
  ORDER BY score DESC, p.username ASC
  LIMIT LEAST(GREATEST(limit_count, 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_participation_leaderboard(integer) TO anon, authenticated;
