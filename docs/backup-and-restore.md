# Backups and Restore (Self-Managed)

This document covers automated daily exports to Supabase Storage and how to restore if managed backups are unavailable.

## What gets exported
- Tables: movies, rankings, movie_lists, movie_list_items, awards, profiles, imports
- Format: JSON files
- Location: Storage bucket `backups/YYYYMMDD/<table>.json`

## How it works
- Edge Function `backup-export` reads tables using the Service Role and writes JSON files to a private `backups` bucket.
- Triggered daily by either:
  - pg_cron job: `admin.invoke_backup_export()` at 03:30 UTC
  - GitHub Actions: `.github/workflows/backup-export.yml` at 04:15 UTC

## One-time setup
1. Ensure secrets:
   - In Supabase Project → Settings → API → copy project URL (SUPABASE_URL) and set as a GitHub repo secret.
   - Create a shared `CRON_SECRET`:
     - Supabase SQL:
       ```sql
       select vault.create_secret('CRON_SECRET', encode(gen_random_bytes(32), 'hex'));
       ```
     - Supabase Dashboard → Edge Functions → Secrets → add the same `CRON_SECRET`
     - GitHub repo → Settings → Secrets and variables → Actions → add `CRON_SECRET` and `SUPABASE_URL`

2. Deploy the Edge Function:
   - `supabase functions deploy backup-export`

3. (Optional) Create pg_cron schedule (Pro plan):
   - Run the migration `20251016001500_backup_wrapper_and_cron.sql` or:
     ```sql
     select cron.schedule('daily-backup-export','30 3 * * *', $$select admin.invoke_backup_export();$$);
     ```

## Verify
- Check Storage → `backups/` for dated folders and JSON files
- The Edge Function returns counts per table

## Restore (from Storage)
When DB is down and managed backups are unavailable:
1. Download the JSON files you need from `backups/YYYYMMDD/`
2. Restore with a local script (example):
   ```python
   # pip install requests python-dotenv
   import os, json, requests
   from dotenv import load_dotenv
   load_dotenv()
   url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
   key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
   headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type':'application/json'}

   def upsert(table, rows):
       r = requests.post(f"{url}/rest/v1/{table}?on_conflict=id", headers=headers, data=json.dumps(rows))
       print(table, r.status_code)

   # Example loading movies.json
   rows = json.load(open('movies.json'))
   batch = 500
   for i in range(0, len(rows), batch):
       upsert('movies', rows[i:i+batch])
   ```
3. Then run enrichment if needed (Edge Function `update-all-movies` or `scripts/enrich_movies.py`).

## Notes
- This export does not include schema—use migrations for schema.
- For very large tables, adjust pagination in the function.
- Keep GitHub Action off if pg_cron is your primary scheduler to avoid duplication.
