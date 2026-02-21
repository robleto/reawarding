# TMDB Enhancement Implementation Plan

## Available TODAY from Existing TMDB API Access

### 1. **Videos (Trailers & Clips)** ⭐ HIGH PRIORITY
**Endpoint:** `GET /movie/{id}/videos`
**What we get:**
- Official trailers (multiple versions)
- Teasers
- Behind-the-scenes clips
- Featurettes
- Clips

**Implementation:**
- Add `videos JSONB` column to movies table
- Store array of: `{ key, name, type, site, size, official }`
- Display in Videos section (replace stub)
- Embed YouTube players on film pages

**Code location:** Update `enrich_movies.py` or create new Edge Function

---

### 2. **Images (Photos Gallery)** ⭐ HIGH PRIORITY
**Endpoint:** `GET /movie/{id}/images`
**What we get:**
- Backdrops (landscape promotional images)
- Posters (all variants/languages)
- Movie stills

**Implementation:**
- Add `images JSONB` column to movies table
- Store: `{ backdrops: [...], posters: [...], logos: [...] }`
- Display in Photos section (replace stub)
- Create image gallery component with lightbox

---

### 3. **Watch Providers (Streaming Availability)** ⭐ HIGH PRIORITY
**Endpoint:** `GET /movie/{id}/watch/providers`
**What we get:**
- Flatrate streaming (Netflix, Prime, Disney+, etc.)
- Rent options (Apple TV, Google Play, etc.)
- Buy options (iTunes, Amazon, etc.)
- **Regional availability** (US, UK, etc.)

**Implementation:**
- Add `watch_providers JSONB` column to movies table
- Store by region: `{ US: { flatrate: [...], rent: [...], buy: [...] } }`
- Display in "Where to Watch" section (replace stub)
- Include provider logos from TMDB

---

### 4. **Similar Movies / Recommendations** ⭐ HIGH PRIORITY
**Endpoint:** `GET /movie/{id}/similar` or `/movie/{id}/recommendations`
**What we get:**
- List of similar movie IDs
- TMDB's ML-based recommendations

**Implementation:**
- Add `similar_movies INT[]` column to movies table
- Store array of tmdb_ids
- Display in "More Like This" section (replace stub)
- Auto-import similar movies if not in DB

---

### 5. **Keywords/Tags** ⭐ MEDIUM PRIORITY
**Endpoint:** `GET /movie/{id}/keywords`
**What we get:**
- Thematic tags (e.g., "dystopia", "heist", "coming of age")
- Plot keywords

**Implementation:**
- Add `keywords TEXT[]` column to movies table
- Display as filter tags
- Enable keyword-based search/filtering

---

### 6. **Reviews** ⭐ MEDIUM PRIORITY
**Endpoint:** `GET /movie/{id}/reviews`
**What we get:**
- Professional critic reviews from TMDB
- User reviews with ratings
- Review authors and dates

**Implementation:**
- Add `tmdb_reviews JSONB` column OR create separate `movie_reviews` table
- Display in Reviews section (replace stub)
- Show excerpt with "Read more" expansion

---

### 7. **Alternative Titles** 🔵 LOW PRIORITY
**Endpoint:** `GET /movie/{id}/alternative_titles`
**What we get:**
- International titles
- Working titles

**Implementation:**
- Add `alternative_titles JSONB` column
- Useful for search/SEO

---

### 8. **Translations** 🔵 LOW PRIORITY
**Endpoint:** `GET /movie/{id}/translations`
**What we get:**
- Translated overviews
- Translated titles

**Implementation:**
- Store in `translations JSONB`
- Future i18n support

---

## Database Migration Needed

```sql
-- Add new JSONB columns for TMDB enrichment
ALTER TABLE movies ADD COLUMN IF NOT EXISTS videos JSONB;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS images JSONB;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS watch_providers JSONB;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS similar_movies INT[];
ALTER TABLE movies ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE movies ADD COLUMN IF NOT EXISTS tmdb_reviews JSONB;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS alternative_titles JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_similar ON movies USING GIN(similar_movies);
CREATE INDEX IF NOT EXISTS idx_movies_keywords ON movies USING GIN(keywords);
```

---

## Python Script Updates

Update `scripts/enrich_movies.py` to include:

```python
def fetch_tmdb_enhanced(tmdb_id):
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}"
    url += "&append_to_response=videos,images,keywords,watch/providers,similar,reviews,release_dates"
    r = requests.get(url)
    r.raise_for_status()
    return r.json()

# Parse videos
videos = []
if tmdb.get('videos', {}).get('results'):
    for v in tmdb['videos']['results']:
        if v.get('site') == 'YouTube':  # Focus on YouTube
            videos.append({
                'key': v.get('key'),
                'name': v.get('name'),
                'type': v.get('type'),  # Trailer, Teaser, Clip, etc.
                'official': v.get('official', False),
                'size': v.get('size', 1080)
            })

# Parse images
images = {
    'backdrops': [{'file_path': img.get('file_path')} for img in tmdb.get('images', {}).get('backdrops', [])[:10]],
    'posters': [{'file_path': img.get('file_path')} for img in tmdb.get('images', {}).get('posters', [])[:10]]
}

# Parse watch providers (focus on US)
watch_providers = None
if tmdb.get('watch/providers', {}).get('results', {}).get('US'):
    us_providers = tmdb['watch/providers']['results']['US']
    watch_providers = {
        'flatrate': us_providers.get('flatrate', []),
        'rent': us_providers.get('rent', []),
        'buy': us_providers.get('buy', [])
    }

# Parse keywords
keywords = [kw.get('name') for kw in tmdb.get('keywords', {}).get('keywords', [])]

# Parse similar movies
similar_movies = [m.get('id') for m in tmdb.get('similar', {}).get('results', [])[:20]]

# Add to update_data
update_data['videos'] = videos
update_data['images'] = images
update_data['watch_providers'] = watch_providers
update_data['keywords'] = keywords
update_data['similar_movies'] = similar_movies
```

---

## Edge Function Alternative

Create `supabase/functions/enrich-movie-media/index.ts` to enrich movies with media data on-demand.

---

## Front-End Component Updates

### 1. Videos Section
Replace stub in `src/app/films/[slug]/[id]/page.tsx`:
```tsx
{movie.videos && movie.videos.length > 0 && (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {movie.videos.slice(0, 6).map((video) => (
      <div key={video.key} className="aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${video.key}`}
          title={video.name}
          className="w-full h-full rounded-lg"
          allowFullScreen
        />
      </div>
    ))}
  </div>
)}
```

### 2. Photos Gallery
```tsx
{movie.images?.backdrops && (
  <div className="grid grid-cols-3 gap-2">
    {movie.images.backdrops.slice(0, 9).map((img, i) => (
      <Image
        key={i}
        src={`https://image.tmdb.org/t/p/w500${img.file_path}`}
        alt="Movie still"
        width={500}
        height={281}
        className="rounded-lg cursor-pointer"
      />
    ))}
  </div>
)}
```

### 3. Streaming Availability
```tsx
{movie.watch_providers?.flatrate && (
  <div className="flex gap-3">
    {movie.watch_providers.flatrate.map((provider) => (
      <div key={provider.provider_id} className="text-center">
        <Image
          src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
          alt={provider.provider_name}
          width={60}
          height={60}
          className="rounded-lg"
        />
        <p className="text-xs mt-1">{provider.provider_name}</p>
      </div>
    ))}
  </div>
)}
```

---

## Priority Implementation Order

1. **Week 1:** Database migration + Videos + Images
2. **Week 2:** Watch Providers + Similar Movies
3. **Week 3:** Keywords + Reviews
4. **Week 4:** Polish UI, add lightbox/modal components

---

## NOT Available from TMDB (Requires Other APIs)

❌ **Oscar/Awards data** - Need separate Academy Awards database or OMDb
❌ **User-generated trivia** - Community feature (our own database)
❌ **Technical specs** (camera, film stock) - Very limited in TMDB
❌ **User reviews from our community** - Our own review system
❌ **Community stats** - Our own aggregation

---

## Estimated Effort

- **Database Migration:** 30 minutes
- **Python Script Updates:** 2-3 hours
- **Front-end Components:** 4-6 hours
- **Testing & Polish:** 2-3 hours

**Total:** ~1-2 days of focused development

---

## Rate Limiting Considerations

- TMDB free tier: 40 requests/10 seconds
- With `append_to_response`, we can get ALL data in 1 request per movie
- Existing `REQUEST_DELAY=0.3` is safe
- Batch enrichment of 1000 movies = ~5 minutes

---

## Next Steps

1. ✅ Review this plan
2. Create database migration
3. Update `enrich_movies.py` script
4. Run enrichment on existing movies
5. Update film page components
6. Deploy and test
