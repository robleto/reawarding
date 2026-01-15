# Backups and Restore (Self-Managed)

This document covers automated daily exports to Supabase Storage and how to restore if managed backups are unavailable.

## What gets exported
- Tables: movies, rankings, movie_lists, movie_list_items, awards, profiles, imports
- Format: JSON files
- Location: Storage bucket `backups/YYYYMMDD/<table>.json`

## How it works
- Self-managed exports are currently **not scheduled**. If you want automated backups again, add a GitHub Action or script-based exporter.

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

2. (Optional) Re-enable automation with a GitHub Action or a local script.

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
3. Then run enrichment if needed (use `scripts/enrich_movies.py`).

## Notes
- This export does not include schema—use migrations for schema.
- For very large tables, adjust pagination in the function.
- If you re-enable automation, avoid running multiple schedulers for the same job.
