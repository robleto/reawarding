# Film Collections - Database Migration

## Overview
Film collections have been migrated from hardcoded TypeScript arrays to database-backed tables. This allows collections to be updated without code deployments.

## Database Schema

### Tables

**`film_collections`** - Collection metadata
- `id` (uuid, primary key)
- `slug` (text, unique) - URL-friendly identifier
- `title` (text) - Display name
- `description` (text) - Short description
- `icon` (text) - Lucide icon name (e.g., "Film", "Star", "Zap")
- `color` (text) - Tailwind color name (e.g., "blue", "gold", "purple")
- `category` (text) - One of: awards, lists, franchises, actors, directors, studios
- `featured` (boolean) - Show in "Featured" tab
- `created_at`, `updated_at` (timestamptz)

**`film_collection_items`** - Movies in each collection
- `collection_id` (uuid, foreign key to film_collections)
- `tmdb_id` (integer) - Movie's TMDB ID
- `added_at` (timestamptz)
- Primary key: (collection_id, tmdb_id)

**`film_collections_with_counts`** - Helper view
- All film_collections columns plus `movie_count`

### RLS Policies
- Collections and items are publicly readable
- Only service role can modify (via scripts/admin tools)

## Scripts

### Populate Collections
```bash
export $(grep -v '^#' .env.local | xargs)
npx tsx scripts/populate-collections-db.ts
```

This script:
1. Queries the movies table for each collection based on director, actor, franchise, or list criteria
2. Upserts collection metadata into `film_collections`
3. Replaces all items in `film_collection_items` for that collection

**Can be run repeatedly** - uses upserts and deletes old items before inserting new ones.

### Current Collections
- **Directors**: Spielberg, Nolan, Tarantino, Wes Anderson, James Cameron
- **Actors**: Adam Sandler, Brad Pitt, Denzel Washington, Tom Hanks, Julia Roberts, Meryl Streep
- **Franchises**: MCU, Star Wars, DC Universe, Fast & Furious, X-Men, Star Trek, Muppets
- **Lists**: Top 50 Grossing All Time, Top 40 Since 2020
- **Studios**: Ghibli, Pixar, Disney Animation, DreamWorks, A24 (currently empty - need manual population)

## Frontend Usage

### Collections Browse Page
**Location**: `src/app/films/collections/page.tsx`

Queries `film_collections_with_counts` view with filters:
```typescript
// Get featured collections
supabase.from('film_collections_with_counts')
  .select('*')
  .eq('featured', true)

// Get by category
supabase.from('film_collections_with_counts')
  .select('*')
  .eq('category', 'directors')
```

### Collection Detail Page
**Location**: `src/app/films/collections/[slug]/page.tsx`

Two queries:
1. Get collection metadata by slug
2. Get TMDB IDs from `film_collection_items`

```typescript
// Get collection
const { data } = await supabase
  .from('film_collections')
  .select('*')
  .eq('slug', 'steven-spielberg')
  .single()

// Get items
const { data: items } = await supabase
  .from('film_collection_items')
  .select('tmdb_id')
  .eq('collection_id', collection.id)
```

## Adding New Collections

### Option 1: Update Script
Edit `scripts/populate-collections-db.ts` and add to `COLLECTIONS` array:

```typescript
{
  metadata: {
    slug: 'coen-brothers',
    title: 'Coen Brothers',
    description: 'Quirky films from Joel and Ethan Coen',
    icon: 'Users',
    color: 'slate',
    category: 'directors',
    featured: false
  },
  type: 'director',
  searchField: 'director',
  searchTerm: 'Coen'
}
```

Then run the populate script.

### Option 2: Manual Insert
Use Supabase SQL Editor:

```sql
-- Insert collection
INSERT INTO film_collections (slug, title, description, icon, color, category, featured)
VALUES ('coen-brothers', 'Coen Brothers', 'Quirky films from Joel and Ethan Coen', 'Users', 'slate', 'directors', false);

-- Get collection ID
SELECT id FROM film_collections WHERE slug = 'coen-brothers';

-- Insert items
INSERT INTO film_collection_items (collection_id, tmdb_id)
SELECT '<collection-id>', tmdb_id
FROM movies
WHERE director ILIKE '%Coen%';
```

## Migration History

**Before**: Collections hardcoded in `src/data/filmCollections.ts` with TMDB IDs in arrays. Required code deployment to update.

**After**: Collections stored in database tables. Can be updated via scripts without deployment.

**Benefits**:
- ✅ No code changes needed to add/remove films
- ✅ Can run automated update scripts (e.g., weekly refresh)
- ✅ No large arrays of numbers in code files
- ✅ Scalable - can have hundreds of collections
- ✅ Same pattern as existing `movie_lists` feature

## Files

### Created
- `supabase/migrations/20260106000000_create_film_collections.sql` - Database schema
- `scripts/populate-collections-db.ts` - Populate script

### Modified
- `src/app/films/collections/page.tsx` - Now queries database
- `src/app/films/collections/[slug]/page.tsx` - Now queries database
- `src/components/films/CollectionCard.tsx` - Updated type interface

### Deprecated (can be removed after testing)
- `scripts/populate-collections.ts` - Old script that wrote to TypeScript file
- `src/data/filmCollections.ts` - Hardcoded collections (kept for backward compatibility during testing)

## Notes

- The 5 empty studio collections (Ghibli, Pixar, Disney, DreamWorks, A24) need manual population or TMDB API queries since studio names aren't in the `production_companies` field for most of these films.
- Collections are cached in the view `film_collections_with_counts` for performance - movie counts are computed on read.
- The populate script can be scheduled via cron or GitHub Actions for periodic updates.
