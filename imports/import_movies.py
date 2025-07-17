#!/usr/bin/env python3
"""
Movie Import Script for Local Supabase Database
Imports movies from CSV or JSON file into the local Supabase movies table.
"""

import os
import json
import pandas as pd
import requests
from dotenv import load_dotenv
from typing import Dict, Any, List
import uuid

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def load_data_from_file(file_path: str) -> List[Dict[str, Any]]:
    """Load movie data from CSV or JSON file."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    if file_path.endswith('.csv'):
        print(f"📄 Loading CSV file: {file_path}")
        df = pd.read_csv(file_path)
        return df.to_dict('records')
    elif file_path.endswith('.json'):
        print(f"📄 Loading JSON file: {file_path}")
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, list) else [data]
    else:
        raise ValueError("Unsupported file format. Use CSV or JSON.")

def normalize_movie_data(movie_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize movie data to match the database schema."""
    
    # Common field mappings - adjust these based on your data structure
    field_mappings = {
        'TMDB_ID': 'tmdb_id',
        'tmdb_id': 'tmdb_id',
        'id': 'tmdb_id',
        'Title': 'title',
        'title': 'title',
        'Overview': 'overview',
        'overview': 'overview',
        'description': 'overview',
        'Release Year': 'release_year',
        'release_year': 'release_year',
        'year': 'release_year',
        'Runtime': 'runtime',
        'runtime': 'runtime',
        'Poster URL': 'poster_url',
        'poster_url': 'poster_url',
        'poster_path': 'poster_url',
        'Thumb URL': 'thumb_url',
        'thumb_url': 'thumb_url',
        'backdrop_path': 'thumb_url',
        'MPAA Rating': 'mpaa_rating',
        'mpaa_rating': 'mpaa_rating',
        'rated': 'mpaa_rating',
        'IMDB Rating': 'imdb_rating',
        'imdb_rating': 'imdb_rating',
        'vote_average': 'tmdb_rating',
        'Metacritic Score': 'metacritic_score',
        'metacritic_score': 'metacritic_score',
        'IMDB ID': 'imdb_id',
        'imdb_id': 'imdb_id',
        'Director': 'director',
        'director': 'director',
        'Cast': 'cast_list',
        'cast_list': 'cast_list',
        'cast': 'cast_list',
        'Genres': 'genres',
        'genres': 'genres',
        'genre_ids': 'genres'
    }
    
    normalized = {}
    
    # Map fields
    for original_key, value in movie_data.items():
        db_key = field_mappings.get(original_key, original_key.lower())
        
        # Skip None or empty values
        if value is None or value == '' or pd.isna(value):
            continue
            
        # Handle special cases
        if db_key == 'tmdb_id':
            try:
                # Ensure it's an integer, not a float
                if isinstance(value, float) and value.is_integer():
                    normalized[db_key] = int(value)
                else:
                    normalized[db_key] = int(value)
            except (ValueError, TypeError):
                continue
                
        elif db_key == 'release_year':
            try:
                # Extract year from various formats
                if isinstance(value, str):
                    # Handle formats like "2023-12-15" or "2023"
                    year = value.split('-')[0] if '-' in value else value
                    normalized[db_key] = int(year)
                else:
                    normalized[db_key] = int(value)
            except (ValueError, TypeError):
                continue
                
        elif db_key in ['runtime', 'metacritic_score']:
            try:
                normalized[db_key] = int(float(value))
            except (ValueError, TypeError):
                continue
                
        elif db_key in ['imdb_rating', 'tmdb_rating']:
            try:
                normalized[db_key] = float(value)
            except (ValueError, TypeError):
                continue
                
        elif db_key in ['genres', 'cast_list']:
            # Handle arrays/lists
            if isinstance(value, str):
                # Try to parse JSON array or split by comma
                try:
                    parsed = json.loads(value)
                    normalized[db_key] = parsed if isinstance(parsed, list) else [str(parsed)]
                except:
                    # Split by comma and clean
                    normalized[db_key] = [item.strip() for item in value.split(',') if item.strip()]
            elif isinstance(value, list):
                normalized[db_key] = value
            else:
                normalized[db_key] = [str(value)]
                
        elif db_key == 'poster_url' and value:
            # Ensure full URL for poster
            if value.startswith('/'):
                normalized[db_key] = f"https://image.tmdb.org/t/p/w500{value}"
            else:
                normalized[db_key] = value
                
        elif db_key == 'thumb_url' and value:
            # Ensure full URL for thumbnail
            if value.startswith('/'):
                normalized[db_key] = f"https://image.tmdb.org/t/p/w300{value}"
            else:
                normalized[db_key] = value
                
        else:
            normalized[db_key] = str(value)
    
    # Ensure required fields
    if 'title' not in normalized:
        return None
        
    return normalized

def insert_movie_batch(movies: List[Dict[str, Any]], batch_size: int = 100):
    """Insert movies in batches with duplicate handling."""
    
    total_movies = len(movies)
    inserted_count = 0
    skipped_count = 0
    error_count = 0
    
    print(f"🎬 Starting import of {total_movies} movies...")
    
    for i in range(0, total_movies, batch_size):
        batch = movies[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total_movies + batch_size - 1) // batch_size
        
        print(f"📦 Processing batch {batch_num}/{total_batches} ({len(batch)} movies)...")
        
        try:
            # Try to insert the batch
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/movies",
                headers=headers,
                json=batch
            )
            
            if response.status_code == 201:
                inserted_count += len(batch)
                print(f"✅ Batch {batch_num} inserted successfully")
            elif response.status_code == 409:
                # Handle duplicates by trying individual inserts
                print(f"⚠️  Batch {batch_num} has duplicates, trying individual inserts...")
                batch_inserted, batch_skipped, batch_errors = insert_movies_individually(batch)
                inserted_count += batch_inserted
                skipped_count += batch_skipped
                error_count += batch_errors
            else:
                print(f"❌ Batch {batch_num} failed: {response.status_code} - {response.text}")
                # Try individual inserts for failed batch
                batch_inserted, batch_skipped, batch_errors = insert_movies_individually(batch)
                inserted_count += batch_inserted
                skipped_count += batch_skipped
                error_count += batch_errors
                
        except Exception as e:
            print(f"❌ Error processing batch {batch_num}: {str(e)}")
            batch_inserted, batch_skipped, batch_errors = insert_movies_individually(batch)
            inserted_count += batch_inserted
            skipped_count += batch_skipped
            error_count += batch_errors
    
    return inserted_count, skipped_count, error_count

def insert_movies_individually(movies: List[Dict[str, Any]]):
    """Insert movies one by one to handle duplicates."""
    inserted = 0
    skipped = 0
    errors = 0
    
    for movie in movies:
        try:
            # Check if movie with this TMDB ID already exists
            if 'tmdb_id' in movie:
                check_response = requests.get(
                    f"{SUPABASE_URL}/rest/v1/movies?tmdb_id=eq.{movie['tmdb_id']}&select=id",
                    headers=headers
                )
                
                if check_response.status_code == 200 and check_response.json():
                    # Movie already exists
                    skipped += 1
                    continue
            
            # Try to insert the movie
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/movies",
                headers=headers,
                json=movie
            )
            
            if response.status_code == 201:
                inserted += 1
            elif response.status_code == 409:
                # Duplicate key error
                skipped += 1
            else:
                print(f"❌ Failed to insert movie '{movie.get('title', 'Unknown')}': {response.status_code} - {response.text}")
                errors += 1
                
        except Exception as e:
            print(f"❌ Error inserting movie '{movie.get('title', 'Unknown')}': {str(e)}")
            errors += 1
    
    return inserted, skipped, errors

def verify_import():
    """Verify the import was successful by counting movies and checking TMDB ID format."""
    try:
        # Get sample TMDB IDs to check format first
        sample_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/movies?select=tmdb_id,title&limit=5",
            headers=headers
        )
        
        if sample_response.status_code == 200:
            movies = sample_response.json()
            print("\n🔍 Sample TMDB IDs in database:")
            for movie in movies:
                tmdb_id = movie['tmdb_id']
                print(f"  {tmdb_id} ({type(tmdb_id).__name__}) - {movie['title']}")
        
        # Get count using simple approach
        count_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/movies?select=id",
            headers=headers
        )
        
        if count_response.status_code == 200:
            count = len(count_response.json())
            return count
        else:
            print(f"❌ Error getting count: {count_response.status_code}")
            return -1
            
    except Exception as e:
        print(f"❌ Error verifying import: {str(e)}")
        return -1

def main():
    """Main import process."""
    
    # You can modify this to point to your actual data file
    # Try these common locations first:
    possible_files = [
        "movies.csv",
        "movies.json", 
        "../movies.csv",
        "../movies.json",
        "data/movies.csv",
        "data/movies.json",
        "exports/movies.csv",
        "exports/movies.json"
    ]
    
    data_file = None
    for file_path in possible_files:
        if os.path.exists(file_path):
            data_file = file_path
            break
    
    if not data_file:
        print("❌ No movie data file found. Please provide the path to your CSV or JSON file.")
        print("Expected locations:")
        for path in possible_files:
            print(f"  - {path}")
        
        # Allow manual input
        manual_path = input("Enter the path to your movie data file: ").strip()
        if manual_path and os.path.exists(manual_path):
            data_file = manual_path
        else:
            print("❌ File not found. Exiting.")
            return
    
    print(f"📁 Using data file: {data_file}")
    
    try:
        # Load and normalize data
        raw_data = load_data_from_file(data_file)
        print(f"📊 Loaded {len(raw_data)} records from file")
        
        # Normalize all movie data
        movies = []
        skipped_normalization = 0
        
        for raw_movie in raw_data:
            normalized = normalize_movie_data(raw_movie)
            if normalized:
                movies.append(normalized)
            else:
                skipped_normalization += 1
        
        print(f"✅ Normalized {len(movies)} movies (skipped {skipped_normalization} invalid records)")
        
        if not movies:
            print("❌ No valid movies to import. Check your data format.")
            return
        
        # Import movies
        inserted, skipped, errors = insert_movie_batch(movies)
        
        # Verify import
        total_movies = verify_import()
        
        # Summary
        print("\n" + "="*50)
        print("📈 IMPORT SUMMARY")
        print("="*50)
        print(f"✅ Movies inserted: {inserted}")
        print(f"⏭️  Movies skipped (duplicates): {skipped}")
        print(f"❌ Movies with errors: {errors}")
        print(f"📊 Total movies in database: {total_movies}")
        print("="*50)
        
        if total_movies > 0:
            print("🎉 Import completed successfully!")
            print("You can now run your rankings import script.")
        else:
            print("⚠️  No movies found in database. Please check for errors.")
            
    except Exception as e:
        print(f"❌ Import failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()
