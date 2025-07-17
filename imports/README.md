# Movie Import Guide

This guide helps you restore your full movies dataset into your local Supabase database.

## Prerequisites

1. **Local Supabase running** on `http://127.0.0.1:54321`
2. **Environment variables** set in your `.env` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
3. **Python dependencies** installed:
   ```bash
   pip install pandas requests python-dotenv
   ```

## Step-by-Step Import Process

### Step 1: Prepare Your Data File

Your movie data should be in CSV or JSON format. The script supports flexible field naming:

**Required Fields:**
- `title` (or `Title`) - Movie title

**Optional but Recommended Fields:**
- `tmdb_id` (or `TMDB_ID`, `id`) - For duplicate detection
- `overview` (or `Overview`, `description`) - Movie description
- `release_year` (or `Release Year`, `year`) - Release year
- `runtime` (or `Runtime`) - Runtime in minutes
- `poster_url` (or `Poster URL`, `poster_path`) - Poster image URL
- `thumb_url` (or `Thumb URL`, `backdrop_path`) - Thumbnail URL
- `mpaa_rating` (or `MPAA Rating`, `rated`) - MPAA rating
- `imdb_rating` (or `IMDB Rating`) - IMDB rating
- `metacritic_score` (or `Metacritic Score`) - Metacritic score
- `imdb_id` (or `IMDB ID`) - IMDB ID
- `director` (or `Director`) - Director name
- `genres` (or `Genres`) - Array of genres
- `cast_list` (or `Cast`, `cast`) - Array of cast members

### Step 2: Place Your Data File

Put your data file in one of these locations:
- `imports/movies.csv` or `imports/movies.json`
- `movies.csv` or `movies.json` (in project root)
- `data/movies.csv` or `data/movies.json`
- `exports/movies.csv` or `exports/movies.json`

Or the script will prompt you for a custom path.

### Step 3: Run the Import Script

```bash
cd imports
python3 import_movies.py
```

The script will:
1. ✅ Load and validate your data file
2. 🔄 Normalize field names to match database schema
3. 📦 Import movies in batches (100 at a time)
4. ⚠️ Handle duplicates gracefully (skip existing movies)
5. 📊 Provide detailed progress and summary

### Step 4: Verify Import

The script automatically verifies the import and shows:
- ✅ Movies inserted
- ⏭️ Movies skipped (duplicates)
- ❌ Movies with errors
- 📊 Total movies in database

## Data Format Examples

### CSV Format
```csv
TMDB_ID,Title,Overview,Release Year,Runtime,Poster URL,Director,Genres
550,Fight Club,A depressed man fights insomnia,1999,139,https://...,David Fincher,"[""Drama"", ""Thriller""]"
```

### JSON Format
```json
[
  {
    "tmdb_id": 550,
    "title": "Fight Club",
    "overview": "A depressed man fights insomnia",
    "release_year": 1999,
    "runtime": 139,
    "poster_url": "https://...",
    "director": "David Fincher",
    "genres": ["Drama", "Thriller"]
  }
]
```

## Generate Sample Data

If you don't have a data file, create sample data to test:

```bash
cd imports
python3 create_sample_data.py
```

## Troubleshooting

### Common Issues

1. **"No movie data file found"**
   - Check file location and name
   - Use the sample data generator to create test data

2. **"Missing required environment variables"**
   - Verify your `.env` file has the correct Supabase URL and service role key
   - Make sure you're using the local development keys

3. **"Connection refused"**
   - Ensure Supabase is running locally: `supabase start`
   - Check that the URL is `http://127.0.0.1:54321`

4. **Import partially fails**
   - Check data format and field names
   - The script will skip invalid records and continue
   - Review error messages for specific issues

### Field Mapping Issues

If your data uses different field names, the script has built-in mappings for common variations. Supported aliases:

- **ID Fields**: `TMDB_ID`, `tmdb_id`, `id`
- **Title**: `Title`, `title`
- **Year**: `Release Year`, `release_year`, `year`
- **Description**: `Overview`, `overview`, `description`
- **And many more...**

### Array Fields (Genres, Cast)

For CSV files, arrays should be JSON strings:
```csv
Genres
"[""Drama"", ""Thriller""]"
```

For JSON files, use actual arrays:
```json
"genres": ["Drama", "Thriller"]
```

## After Import

Once movies are imported successfully:

1. **Run Rankings Import**:
   ```bash
   python3 import_rankings.py
   ```

2. **Check Your App**:
   - Navigate to `http://127.0.0.1:3002/films`
   - You should see all your movies and rankings

3. **Test Drag & Drop**:
   - Go to `http://127.0.0.1:3002/lists`
   - Create a list and test the drag-and-drop functionality

## Database Schema

The movies table schema:
```sql
CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    imdb_id VARCHAR(20),
    title TEXT NOT NULL,
    overview TEXT,
    release_year INTEGER,
    runtime INTEGER,
    poster_url TEXT,
    thumb_url TEXT,
    mpaa_rating VARCHAR(10),
    imdb_rating DECIMAL(3,1),
    metacritic_score INTEGER,
    tmdb_rating DECIMAL(3,1),
    genres TEXT[],
    director TEXT,
    cast_list TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Need Help?

If you encounter issues:

1. Check the error messages - they're designed to be helpful
2. Verify your data format matches the examples
3. Try the sample data generator to test the import process
4. Check that your local Supabase is running and accessible
