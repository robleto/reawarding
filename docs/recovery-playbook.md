# Disaster Recovery Playbook (No Backups)

This playbook restores the `movies` table using existing local assets and TMDB, then enriches metadata via Edge Functions.

## 0) Prereqs
- .env/.env.local has:
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - TMDB_API_KEY
  - (optional) OMDB_API_KEY
- Python packages: requests, python-dotenv, tqdm

## 1) Create imports log table (one-time)
Run in Supabase SQL Editor:

```sql
create table if not exists public.imports (
  id bigserial primary key,
  tmdb_id integer not null,
  status text not null check (status in ('success','error')),
  notes text,
  imported_at timestamptz not null default now()
);
create index if not exists idx_imports_tmdb_time on public.imports (tmdb_id, imported_at desc);
```

## 2) Seed movies from posters
This script parses `public/posters/*.jpg`, uses TMDB search to resolve title/year → tmdb_id, and upserts rows.

```bash
# Install deps
pip install requests python-dotenv tqdm

# Run (dry run first)
python3 scripts/rebuild_from_posters.py --dry-run --limit 200

# Then run for real
python3 scripts/rebuild_from_posters.py --limit 5000
```

Notes:
- Poster filename format assumed: `slug-title-YYYY.jpg` (e.g., `12-angry-men-1957.jpg`)
- Script fills poster_url as `/posters/<file>` and thumb_url if `/thumbs/<file>` exists

## 3) Enrich metadata for all movies
Pick one of the two methods:

### A) Edge Function (update-all-movies)
```bash
# Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or service role bearer if protected
# Uses Service Role inside the function
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/update-all-movies" \
  -d '{"limit":1900, "requestDelay":300}'
```

### B) Local script
```bash
python3 scripts/enrich_movies.py
```

## 4) Verify freshness
```sql
select * from admin.last_updates() order by last_update desc limit 20;
select count(*) from movies;
```

## 5) Optional: resume trending ingestion
- Ensure CRON_SECRET exists in Vault and cron points to the working job
- Run the trending scraper manually once:
```bash
curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/tmdb-trending-scraper"
```

## 6) Next steps
- Re-import rankings if you have CSVs: `python3 imports/import_rankings.py`
- Add any custom SQL to rebuild derived tables
- If you regain a backup or Supabase can restore, stop and use that instead
