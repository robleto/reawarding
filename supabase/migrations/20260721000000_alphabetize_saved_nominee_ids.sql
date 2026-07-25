-- Nominee display order now defaults to alphabetical (by title) everywhere it's
-- listed, instead of rating-descending. Existing saved ballots were persisted
-- in whatever order the old rating-sorted default produced, so normalize them
-- here to match. winner_id is untouched — it's tracked independently of
-- nominee_ids order and is never affected by this reshuffle.
update awards a
set nominee_ids = sub.sorted_ids
from (
  select a2.id,
         array_agg(nid.movie_id order by m.title) as sorted_ids
  from awards a2
  cross join lateral unnest(a2.nominee_ids) as nid(movie_id)
  join movies m on m.id = nid.movie_id
  group by a2.id
) sub
where a.id = sub.id
  and a.nominee_ids <> sub.sorted_ids;
