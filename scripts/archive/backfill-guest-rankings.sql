-- Inspect recent guest rankings for a user
SELECT id, user_id, movie_id, ranking, seen_it, created_at, updated_at
FROM rankings
WHERE user_id = '{{USER_ID}}'
ORDER BY updated_at DESC
LIMIT 20;