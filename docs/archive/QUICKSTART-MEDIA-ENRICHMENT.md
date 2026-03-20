# Quick Start: TMDB Media Enrichment

Get videos, photos, streaming availability, and recommendations on your film pages in under 10 minutes!

## What You'll Get

- 🎬 **Trailers & Videos** - Official trailers, clips, behind-the-scenes
- 📷 **Photo Gallery** - Backdrops, posters, movie stills
- ▶️ **Streaming Availability** - Netflix, Prime, Disney+, etc.
- 👍 **Similar Movies** - AI-powered recommendations
- 🏷️ **Keywords** - Thematic tags for better filtering
- 💬 **Reviews** - TMDB critic/user reviews

## Prerequisites

- Python 3 installed
- `.env.local` file with API keys:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url
  SUPABASE_SERVICE_ROLE_KEY=your_key
  TMDB_API_KEY=your_tmdb_key
  OMDB_API_KEY=your_omdb_key (optional)
  ```

## Option 1: Automated Quick Start (Recommended)

```bash
./scripts/quickstart-media-enrichment.sh
```

Follow the prompts to:
1. Apply database migration
2. Enrich movies with media data

## Option 2: Manual Steps

### Step 1: Apply Database Migration

**Via Supabase Dashboard (Easiest):**
1. Go to your Supabase project → SQL Editor
2. Open `supabase/migrations/20251113000000_add_tmdb_media_enrichment.sql`
3. Copy and paste the entire contents
4. Click "Run"

**Via Supabase CLI (Requires Docker):**
```bash
supabase db reset
```

### Step 2: Run Enrichment Script

**Test with 10 movies first:**
```bash
export LIMIT=10
export ENRICH_MEDIA=true
python3 scripts/enrich_movies_enhanced.py
```

**Then enrich more:**
```bash
export LIMIT=100
python3 scripts/enrich_movies_enhanced.py
```

## Verification

1. Check database - new columns should have data:
   ```sql
   SELECT id, title, 
          videos IS NOT NULL as has_videos,
          images IS NOT NULL as has_images,
          watch_providers IS NOT NULL as has_streaming
   FROM movies 
   WHERE media_enriched_at IS NOT NULL 
   LIMIT 10;
   ```

2. Visit a film page: `/films/parasite/123`
   - Videos section should show trailers
   - Photos should display (if migration applied)
   - Streaming providers should appear

## Troubleshooting

### "Column does not exist" error
→ Migration not applied. Run Step 1 again.

### No data appearing on film pages
→ Front-end components need to check for data. The stub sections will hide when data exists and columns are present.

### Rate limiting errors
→ Increase `REQUEST_DELAY` environment variable:
```bash
export REQUEST_DELAY=0.5
```

## Environment Variables

- `LIMIT` - Number of movies to process (default: 50)
- `ENRICH_MEDIA` - Enable media enrichment (default: true)
- `REQUEST_DELAY` - Seconds between API calls (default: 0.3)

## What Happens Next?

Once enriched:
- Film pages automatically show media when data exists
- Videos embed YouTube players
- Photos display in galleries
- Streaming providers show with logos
- Similar movies link to recommendations

## Performance

- **10 movies** ≈ 30-45 seconds
- **50 movies** ≈ 3-4 minutes
- **100 movies** ≈ 6-8 minutes
- **1000 movies** ≈ 60-80 minutes

Safe for TMDB free tier (40 requests/10 seconds).

## Next Steps

After enrichment:
1. Update film page components to display the data
2. Add video player modals
3. Create photo gallery lightbox
4. Style streaming provider cards

See `docs/tmdb-enhancement-plan.md` for full implementation details.
