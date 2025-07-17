#!/usr/bin/env python3
"""
Sample Data Generator for Movie Import
Creates a sample CSV file to show the expected format for movie data.
"""

import csv
import json
from datetime import datetime

def create_sample_csv():
    """Create a sample CSV file with movie data."""
    
    sample_movies = [
        {
            'TMDB_ID': 550,
            'Title': 'Fight Club',
            'Overview': 'A depressed man fights his insomnia by attending various support groups.',
            'Release Year': 1999,
            'Runtime': 139,
            'Poster URL': 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
            'Thumb URL': 'https://image.tmdb.org/t/p/w300/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
            'MPAA Rating': 'R',
            'IMDB Rating': 8.8,
            'Metacritic Score': 66,
            'IMDB ID': 'tt0137523',
            'Director': 'David Fincher',
            'Genres': '["Drama", "Thriller"]',
            'Cast': '["Brad Pitt", "Edward Norton", "Helena Bonham Carter"]'
        },
        {
            'TMDB_ID': 13,
            'Title': 'Forrest Gump',
            'Overview': 'The presidencies of Kennedy and Johnson through the eyes of an Alabama man.',
            'Release Year': 1994,
            'Runtime': 142,
            'Poster URL': 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
            'Thumb URL': 'https://image.tmdb.org/t/p/w300/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
            'MPAA Rating': 'PG-13',
            'IMDB Rating': 8.8,
            'Metacritic Score': 82,
            'IMDB ID': 'tt0109830',
            'Director': 'Robert Zemeckis',
            'Genres': '["Drama", "Romance"]',
            'Cast': '["Tom Hanks", "Robin Wright", "Gary Sinise"]'
        },
        {
            'TMDB_ID': 680,
            'Title': 'Pulp Fiction',
            'Overview': 'The lives of two mob hitmen, a boxer, and others intertwine.',
            'Release Year': 1994,
            'Runtime': 154,
            'Poster URL': 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
            'Thumb URL': 'https://image.tmdb.org/t/p/w300/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
            'MPAA Rating': 'R',
            'IMDB Rating': 8.9,
            'Metacritic Score': 94,
            'IMDB ID': 'tt0110912',
            'Director': 'Quentin Tarantino',
            'Genres': '["Crime", "Drama"]',
            'Cast': '["John Travolta", "Uma Thurman", "Samuel L. Jackson"]'
        }
    ]
    
    filename = 'sample_movies.csv'
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = sample_movies[0].keys()
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for movie in sample_movies:
            writer.writerow(movie)
    
    print(f"✅ Created sample CSV file: {filename}")
    print("This file shows the expected format for your movie data.")
    return filename

def create_sample_json():
    """Create a sample JSON file with movie data."""
    
    sample_movies = [
        {
            "tmdb_id": 550,
            "title": "Fight Club",
            "overview": "A depressed man fights his insomnia by attending various support groups.",
            "release_year": 1999,
            "runtime": 139,
            "poster_url": "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
            "thumb_url": "https://image.tmdb.org/t/p/w300/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
            "mpaa_rating": "R",
            "imdb_rating": 8.8,
            "metacritic_score": 66,
            "imdb_id": "tt0137523",
            "director": "David Fincher",
            "genres": ["Drama", "Thriller"],
            "cast_list": ["Brad Pitt", "Edward Norton", "Helena Bonham Carter"]
        },
        {
            "tmdb_id": 13,
            "title": "Forrest Gump",
            "overview": "The presidencies of Kennedy and Johnson through the eyes of an Alabama man.",
            "release_year": 1994,
            "runtime": 142,
            "poster_url": "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
            "thumb_url": "https://image.tmdb.org/t/p/w300/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
            "mpaa_rating": "PG-13",
            "imdb_rating": 8.8,
            "metacritic_score": 82,
            "imdb_id": "tt0109830",
            "director": "Robert Zemeckis",
            "genres": ["Drama", "Romance"],
            "cast_list": ["Tom Hanks", "Robin Wright", "Gary Sinise"]
        }
    ]
    
    filename = 'sample_movies.json'
    
    with open(filename, 'w', encoding='utf-8') as jsonfile:
        json.dump(sample_movies, jsonfile, indent=2, ensure_ascii=False)
    
    print(f"✅ Created sample JSON file: {filename}")
    print("This file shows the expected format for your movie data.")
    return filename

def show_supported_formats():
    """Show supported data formats and field mappings."""
    
    print("📋 SUPPORTED DATA FORMATS")
    print("=" * 50)
    print("\n1. CSV Format:")
    print("   - Headers can use various naming conventions")
    print("   - Arrays (genres, cast) should be JSON strings")
    print("   - Example: '\"[\"Drama\", \"Thriller\"]\"'")
    
    print("\n2. JSON Format:")
    print("   - Standard JSON array of objects")
    print("   - Arrays can be proper JSON arrays")
    print("   - Field names are flexible")
    
    print("\n📝 SUPPORTED FIELD MAPPINGS:")
    print("=" * 50)
    
    mappings = {
        "Movie ID": ["TMDB_ID", "tmdb_id", "id"],
        "Title": ["Title", "title"],
        "Description": ["Overview", "overview", "description"],
        "Year": ["Release Year", "release_year", "year"],
        "Runtime": ["Runtime", "runtime"],
        "Poster": ["Poster URL", "poster_url", "poster_path"],
        "Thumbnail": ["Thumb URL", "thumb_url", "backdrop_path"],
        "Rating": ["MPAA Rating", "mpaa_rating", "rated"],
        "IMDB Rating": ["IMDB Rating", "imdb_rating"],
        "TMDB Rating": ["vote_average"],
        "Metacritic": ["Metacritic Score", "metacritic_score"],
        "IMDB ID": ["IMDB ID", "imdb_id"],
        "Director": ["Director", "director"],
        "Genres": ["Genres", "genres", "genre_ids"],
        "Cast": ["Cast", "cast_list", "cast"]
    }
    
    for field, aliases in mappings.items():
        print(f"{field:15}: {', '.join(aliases)}")
    
    print("\n💡 TIPS:")
    print("=" * 50)
    print("- TMDB_ID is recommended for duplicate detection")
    print("- Title is required")
    print("- Arrays can be JSON strings or actual arrays")
    print("- URLs starting with '/' will be prefixed with TMDB base URL")
    print("- Invalid/missing data will be skipped gracefully")

if __name__ == "__main__":
    print("🎬 Movie Data Sample Generator")
    print("=" * 50)
    
    choice = input("Choose an option:\n1. Create sample CSV\n2. Create sample JSON\n3. Show format info\n4. Create both samples\nChoice (1-4): ").strip()
    
    if choice == "1":
        create_sample_csv()
    elif choice == "2":
        create_sample_json()
    elif choice == "3":
        show_supported_formats()
    elif choice == "4":
        create_sample_csv()
        create_sample_json()
        print("\n")
        show_supported_formats()
    else:
        print("Invalid choice. Run the script again.")
