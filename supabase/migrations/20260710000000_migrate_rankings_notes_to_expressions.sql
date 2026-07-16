-- Retire rankings.notes in favor of expressions.notes.
--
-- The expression layer (expressions table) is the single home for per-user,
-- per-film notes. rankings.notes was schema drift: no code path read or wrote
-- it, and production had 0 non-null values at migration time (verified
-- 2026-07-10, 1,235 rankings rows). rankings stays pure loop data:
-- seen_it + ranking.
--
-- The copy step is defensive — a no-op in production, but keeps this
-- migration correct in any environment where the column did collect data.

insert into public.expressions (user_id, movie_id, notes)
select r.user_id, r.movie_id, r.notes
from public.rankings r
where r.notes is not null
on conflict (user_id, movie_id) do update
  set notes = coalesce(public.expressions.notes, excluded.notes);

alter table public.rankings drop column if exists notes;
