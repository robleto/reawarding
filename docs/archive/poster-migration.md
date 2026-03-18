# Poster/Thumbnail Image Pipeline

Images are served from **Cloudflare R2** (`reawarding-images` bucket) via the public CDN base URL in `R2_PUBLIC_BASE_REAWARDING`.

`movies.poster_url` and `movies.thumb_url` are updated in-place to point to R2 URLs. The script is idempotent — it skips any URL that already contains `r2.dev`.

## Active script

```bash
node scripts/ingest-tmdb-images-to-r2.mjs
```

Reads `.env.local` automatically.

## How it works

1. Pages through all movies in Supabase (500 per batch)
2. Fetches each `poster_url` and `thumb_url` from the remote source
3. Uploads to R2 under `posters/<id>.jpg` and `thumbs/<id>.jpg`
4. Updates `movies.poster_url` and `movies.thumb_url` to the new R2 CDN URL

## Required env (in `.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_REAWARDING`

## Notes
- Any URL already containing `r2.dev` is skipped (safe to re-run)
- TMDB URLs remain in the database as the source until ingested; the script replaces them in-place
- Bucket name is hardcoded as `reawarding-images`

---

## Old pipeline (archived)

The previous approach mirrored images into **Supabase Storage** using `npm run media:mirror` and wrote to `cached_poster_url` / `cached_thumb_url`. That pipeline has been replaced by the R2 script above.
