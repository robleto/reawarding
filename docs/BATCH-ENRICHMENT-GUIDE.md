# Batch Enrichment Guide

You have **three options** to enrich your remaining movies:

## Option 1: Automated Batch Script (Recommended) ⭐

Run the automated batch script that processes movies in chunks:

```bash
# Enrich 50 movies at a time, up to 10 batches (500 total)
./scripts/batch-enrich-all.sh

# Or customize batch size and max batches
./scripts/batch-enrich-all.sh 100 5  # 100 per batch, max 5 batches = 500 movies
```

**Features**:
- Automatically checks how many movies need enrichment
- Processes in safe batches with 5-second pauses between
- Stops automatically when all movies are enriched
- Shows progress after each batch
- Safe Ctrl+C to stop at any time

---

## Option 2: Manual Batches (Full Control) 

Run the enrichment script manually with different limits:

### Enrich 50 movies
```bash
export $(cat .env.local | grep -v '^#' | xargs)
export LIMIT=50
export ENRICH_MEDIA=true
python3 scripts/enrich_movies_enhanced.py
```

### Enrich 100 movies
```bash
export $(cat .env.local | grep -v '^#' | xargs)
export LIMIT=100
export ENRICH_MEDIA=true
python3 scripts/enrich_movies_enhanced.py
```

### Enrich ALL remaining movies
```bash
export $(cat .env.local | grep -v '^#' | xargs)
export LIMIT=10000  # Set very high limit
export ENRICH_MEDIA=true
python3 scripts/enrich_movies_enhanced.py
```

**Note**: The script only enriches movies that:
- Have `tmdb_id` set (not null)
- Don't have `media_enriched_at` timestamp yet

---

## Option 3: GitHub Actions (Scheduled)

If you want automated runs, use the GitHub Actions pipeline that runs discovery + enrichment on a schedule.
See `.github/workflows/ingest-discover-enrich.yml`.

---

## Performance Expectations

### TMDB API Rate Limits
- **Free tier**: 40 requests per 10 seconds
- **Current delay**: 0.3 seconds between requests (safe)
- **Throughput**: ~120 movies per minute

### Time Estimates
| Movies | Time (approx) |
|--------|---------------|
| 50     | ~25 seconds   |
| 100    | ~50 seconds   |
| 500    | ~4 minutes    |
| 1000   | ~8 minutes    |

---

## Checking Status

### Before enrichment
```bash
export $(cat .env.local | grep -v '^#' | xargs)
python3 -c "
from supabase import create_client
import os

supabase = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

total = supabase.table('movies').select('id', count='exact').execute()
enriched = supabase.table('movies').select('id', count='exact').not_.is_('media_enriched_at', 'null').execute()

print(f'Total movies: {total.count}')
print(f'Already enriched: {enriched.count}')
print(f'Remaining: {total.count - enriched.count}')
"
```

### After enrichment
Same command - check the counts to verify progress.

### Find enriched movies to test
```sql
-- Run in Supabase SQL Editor
SELECT id, title, release_year, tmdb_id,
  jsonb_array_length(videos::jsonb) as video_count,
  array_length(keywords, 1) as keyword_count
FROM movies
WHERE media_enriched_at IS NOT NULL
ORDER BY media_enriched_at DESC
LIMIT 20;
```

---

## Troubleshooting

### If enrichment stops/fails
- Check the error message in terminal output
- Most common: TMDB API rate limit (wait 10 seconds, try again)
- Script auto-skips movies without `tmdb_id`

### If movies don't have TMDB IDs
Run the TMDB discovery importer first:
```bash
npm run ingest:discover
```

### If videos/images don't show on film pages
1. Verify data exists in database (SQL query above)
2. Check browser console for errors
3. Verify YouTube/TMDB domains in `next.config.js`
4. Clear browser cache and hard reload

---

## Recommended Workflow

**For first-time enrichment**:

1. **Start small** (test):
   ```bash
   export $(cat .env.local | grep -v '^#' | xargs)
   export LIMIT=10
   python3 scripts/enrich_movies_enhanced.py
   ```

2. **Check results** in Supabase or test a film page

3. **Run full batch**:
   ```bash
   ./scripts/batch-enrich-all.sh 100 50
   # 100 per batch, up to 50 batches = 5000 movies
   ```

4. **Monitor progress** - script shows success/error counts after each batch

5. **Test film pages** with enriched data

---

## What Gets Enriched

For each movie with a `tmdb_id`:
- ✅ **Videos**: Trailers, clips, teasers (YouTube only)
- ✅ **Images**: Backdrop images (up to 10)
- ✅ **Keywords**: Thematic tags (all available)
- ✅ **Watch Providers**: Streaming availability (US/GB/CA)
- ✅ **Similar Movies**: Recommendation IDs (up to 20)
- ✅ **Reviews**: TMDB platform reviews (up to 5)
- ✅ **Backdrop URL**: Primary hero image

All data stored in JSONB/array columns with GIN indexes for fast querying.

---

## Next Steps After Enrichment

1. Test enriched film pages
2. Set up scheduled enrichment for new movies
3. Consider enriching more data:
   - Cast/crew with photos
   - Full credits
   - Production details
   - Alternative titles

See `docs/tmdb-enhancement-plan.md` for full roadmap.
