# How to Update Film Collections

## Quick Reference

### Re-populate All Collections (Auto-update from database)
```bash
export $(grep -v '^#' .env.local | xargs)
npx tsx scripts/populate-collections-db.ts
```

### Populate Studio Collections (Manual TMDB IDs)
```bash
export $(grep -v '^#' .env.local | xargs)
npx tsx scripts/populate-studio-collections.ts
```

## Common Tasks

### 1. Fix False Positives

**Problem**: "Thoroughly Modern Millie" appears in MCU collection because it has a character named "Captain Marvel"

**Solution**: Add TMDB ID to `excludeIds` array in `scripts/populate-collections-db.ts`:

```typescript
{
  metadata: {
    slug: 'marvel-cinematic-universe',
    // ... other fields
  },
  type: 'title-pattern',
  titlePatterns: ['Avengers', 'Iron Man', 'Captain Marvel', ...],
  excludeIds: [11164, 54321] // Add TMDB IDs to exclude
}
```

Then re-run the populate script.

### 2. Add Films to Empty Studio Collections

**Problem**: Pixar, Ghibli, Disney Animation, DreamWorks, A24 collections are empty

**Why**: Studio names aren't in the `production_companies` field for most films in your database

**Solution**: Edit `scripts/populate-studio-collections.ts` and add TMDB IDs:

```typescript
const STUDIO_COLLECTIONS: Record<string, number[]> = {
  'pixar-collection': [
    862,    // Toy Story
    863,    // Toy Story 2
    12,     // Finding Nemo
    // Add more...
  ],
  // ... other studios
};
```

**How to find TMDB IDs**:
1. Search TMDB: https://www.themoviedb.org/movie/862 (ID is in URL)
2. Or query your database: `SELECT tmdb_id, title FROM movies WHERE title ILIKE '%toy story%'`

### 3. Add a New Collection

**Example**: Add "Coen Brothers" collection

1. Edit `scripts/populate-collections-db.ts`
2. Add to `COLLECTIONS` array:

```typescript
{
  metadata: {
    slug: 'coen-brothers',
    title: 'Coen Brothers',
    description: 'Quirky films from Joel and Ethan Coen',
    icon: 'Users',        // Any Lucide icon name
    color: 'slate',       // Tailwind color
    category: 'directors', // awards|lists|franchises|actors|directors|studios
    featured: false       // Show in "Featured" tab?
  },
  type: 'director',
  searchField: 'director',
  searchTerm: 'Coen'
}
```

3. Run populate script

**Query Types**:
- `director`: Search `director` field
- `actor`: Search `cast_list` array
- `title-pattern`: Search `title` with multiple patterns
- `studio`: Search `studio` + `production_companies`
- `top-grossing`: Query by `revenue` DESC
- `top-recent`: Query by `revenue` DESC + `release_date` >= year

### 4. Update Existing Collection

**Option A - Auto-Update** (if query-based):
Just re-run the populate script - it will pick up new movies automatically.

**Option B - Manual Add** (for specific TMDB IDs):

```sql
-- Get collection ID
SELECT id FROM film_collections WHERE slug = 'marvel-cinematic-universe';

-- Add new movie
INSERT INTO film_collection_items (collection_id, tmdb_id)
VALUES ('<collection-id>', 823464); -- Ant-Man: Quantumania
```

**Option C - Edit Script and Re-run**:
Add to `excludeIds`, change `titlePatterns`, etc., then re-run.

### 5. Remove a Collection

```sql
-- This will cascade-delete all items too
DELETE FROM film_collections WHERE slug = 'unwanted-collection';
```

Or comment out in the populate script so it doesn't get recreated.

### 6. Change Collection Metadata (Title, Icon, Color, etc.)

**Option A - Edit Script**:
1. Update in `scripts/populate-collections-db.ts`
2. Re-run script (uses UPSERT so will update existing)

**Option B - Direct SQL**:
```sql
UPDATE film_collections 
SET 
  title = 'New Title',
  icon = 'NewIcon',
  color = 'emerald',
  featured = true
WHERE slug = 'collection-slug';
```

## Workflow for Major Updates

**Recommended flow**:

1. Edit `scripts/populate-collections-db.ts` for query-based collections
2. Edit `scripts/populate-studio-collections.ts` for manual TMDB ID collections
3. Run both scripts:
   ```bash
   export $(grep -v '^#' .env.local | xargs)
   npx tsx scripts/populate-collections-db.ts
   npx tsx scripts/populate-studio-collections.ts
   ```
4. Test in browser at `/films/collections`
5. Commit the script changes

## Finding TMDB IDs

### Method 1: TMDB Website
- Visit https://www.themoviedb.org/
- Search for movie
- ID is in URL: `https://www.themoviedb.org/movie/862` → ID is `862`

### Method 2: Query Your Database
```sql
-- Search by title
SELECT tmdb_id, title, release_date 
FROM movies 
WHERE title ILIKE '%matrix%'
ORDER BY release_date;

-- Get all Pixar films (if studio field populated)
SELECT tmdb_id, title, studio
FROM movies
WHERE studio ILIKE '%pixar%'
OR 'Pixar' = ANY(production_companies);
```

### Method 3: Use existing TMDB import tool
If you have a TMDB import script, look at recent imports:
```sql
SELECT tmdb_id, title, created_at
FROM movies
ORDER BY created_at DESC
LIMIT 20;
```

## Scheduled Updates

To keep collections fresh, you can:

### Option 1: GitHub Actions
Create `.github/workflows/update-collections.yml`:

```yaml
name: Update Collections
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch: # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx tsx scripts/populate-collections-db.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Option 2: Supabase Edge Function + pg_cron
Create an edge function that runs the queries and schedule via pg_cron.

### Option 3: Manual
Just run the scripts whenever you import new movies.

## Tips

1. **Test queries first**: Run SQL queries in Supabase SQL Editor before adding to script
2. **Check counts**: After populating, verify counts in the browser UI
3. **Version control**: Commit script changes so you have history
4. **Batch updates**: Group related changes and run once vs. many small runs
5. **Backup data**: Collections can be recreated anytime from the script
