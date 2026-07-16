#!/usr/bin/env python3
"""
Enhanced TMDB Enrichment Script
Adds media data: videos, images, watch providers, similar movies, keywords
"""
import os
import time
import json
import requests
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
OMDB_API_KEY = os.environ.get('OMDB_API_KEY')
REQUEST_DELAY = float(os.environ.get('REQUEST_DELAY', '0.3'))  # seconds
LIMIT = int(os.environ.get('LIMIT', '50'))  # Start with just 50 for testing
ENRICH_MEDIA = os.environ.get('ENRICH_MEDIA', 'true').lower() == 'true'

if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY]):
    raise Exception('Missing required environment variables.')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def fetch_tmdb_data(tmdb_id):
    """Fetch comprehensive movie data from TMDB with media enrichment"""
    # Add media enrichment parameters
    append = "credits,external_ids,release_dates"
    if ENRICH_MEDIA:
        append += ",videos,images,keywords,watch/providers,similar,reviews"
    
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}&append_to_response={append}"
    r = requests.get(url)
    r.raise_for_status()
    return r.json()

def fetch_omdb_data(imdb_id):
    if not imdb_id or not OMDB_API_KEY:
        return None
    url = f"https://www.omdbapi.com/?i={imdb_id}&apikey={OMDB_API_KEY}"
    r = requests.get(url)
    if r.status_code != 200:
        return None
    data = r.json()
    return data if data.get('Response') == 'True' else None

def parse_videos(tmdb_data):
    """Extract and format video data (trailers, clips)"""
    videos = []
    if tmdb_data.get('videos', {}).get('results'):
        for v in tmdb_data['videos']['results']:
            # Focus on YouTube videos
            if v.get('site') == 'YouTube':
                videos.append({
                    'key': v.get('key'),
                    'name': v.get('name'),
                    'type': v.get('type'),  # Trailer, Teaser, Clip, etc.
                    'site': v.get('site'),
                    'official': v.get('official', False),
                    'size': v.get('size', 1080)
                })
    return videos

def parse_images(tmdb_data):
    """Extract and format image data (backdrops, posters)"""
    images = {}
    if tmdb_data.get('images'):
        # Limit to top 10 of each type to save space
        if tmdb_data['images'].get('backdrops'):
            images['backdrops'] = [
                {
                    'file_path': img.get('file_path'),
                    'aspect_ratio': img.get('aspect_ratio'),
                    'width': img.get('width'),
                    'height': img.get('height')
                }
                for img in tmdb_data['images']['backdrops'][:10]
            ]
        if tmdb_data['images'].get('posters'):
            images['posters'] = [
                {
                    'file_path': img.get('file_path'),
                    'aspect_ratio': img.get('aspect_ratio'),
                    'width': img.get('width'),
                    'height': img.get('height')
                }
                for img in tmdb_data['images']['posters'][:10]
            ]
    return images if images else None

def parse_watch_providers(tmdb_data):
    """Extract streaming availability data"""
    watch_providers = {}
    if tmdb_data.get('watch/providers', {}).get('results'):
        # Focus on US market (can expand to other regions later)
        for region in ['US', 'GB', 'CA']:
            if region in tmdb_data['watch/providers']['results']:
                region_data = tmdb_data['watch/providers']['results'][region]
                watch_providers[region] = {}
                
                for provider_type in ['flatrate', 'rent', 'buy']:
                    if region_data.get(provider_type):
                        watch_providers[region][provider_type] = [
                            {
                                'provider_id': p.get('provider_id'),
                                'provider_name': p.get('provider_name'),
                                'logo_path': p.get('logo_path'),
                                'display_priority': p.get('display_priority')
                            }
                            for p in region_data[provider_type]
                        ]
    return watch_providers if watch_providers else None

def parse_keywords(tmdb_data):
    """Extract thematic keywords"""
    keywords = []
    if tmdb_data.get('keywords', {}).get('keywords'):
        keywords = [kw.get('name') for kw in tmdb_data['keywords']['keywords'] if kw.get('name')]
    return keywords

def parse_similar_movies(tmdb_data):
    """Extract similar movie IDs"""
    similar = []
    if tmdb_data.get('similar', {}).get('results'):
        # Limit to top 20 recommendations
        similar = [m.get('id') for m in tmdb_data['similar']['results'][:20] if m.get('id')]
    return similar

def parse_reviews(tmdb_data):
    """Extract TMDB reviews (limit to avoid huge data)"""
    reviews = []
    if tmdb_data.get('reviews', {}).get('results'):
        for r in tmdb_data['reviews']['results'][:5]:  # Top 5 reviews only
            reviews.append({
                'author': r.get('author'),
                'content': r.get('content', '')[:500],  # Truncate long reviews
                'created_at': r.get('created_at'),
                'rating': r.get('author_details', {}).get('rating'),
                'url': r.get('url')
            })
    return reviews

def get_backdrop_url(tmdb_data):
    """Get primary backdrop image URL"""
    if tmdb_data.get('backdrop_path'):
        return f"https://image.tmdb.org/t/p/original{tmdb_data['backdrop_path']}"
    return None

def main():
    # Get movies to enrich - prioritize those without media enrichment
    print(f"Fetching up to {LIMIT} movies to enrich...")
    
    # First try movies that have never been media-enriched
    movies = supabase.table('movies').select('id, tmdb_id').is_('media_enriched_at', None).limit(LIMIT).execute().data
    
    # If not enough, get movies that need basic enrichment
    if len(movies) < LIMIT:
        additional = supabase.table('movies').select('id, tmdb_id').is_('overview', None).limit(LIMIT - len(movies)).execute().data
        movies.extend(additional)
    
    print(f"Found {len(movies)} movies to update")
    
    success_count = 0
    error_count = 0
    
    for idx, movie in enumerate(movies, 1):
        tmdb_id = movie.get('tmdb_id')
        if not tmdb_id:
            print(f"[{idx}/{len(movies)}] Skipping movie ID {movie.get('id')} - missing tmdb_id")
            error_count += 1
            continue
        
        try:
            print(f"[{idx}/{len(movies)}] Processing movie ID {movie.get('id')} (TMDB: {tmdb_id})...")
            tmdb = fetch_tmdb_data(tmdb_id)
            
            # Basic metadata
            overview = tmdb.get('overview')
            runtime = tmdb.get('runtime')
            tmdb_rating = tmdb.get('vote_average')
            genres = [g['name'] for g in tmdb.get('genres', [])]
            imdb_id = tmdb.get('external_ids', {}).get('imdb_id') or tmdb.get('imdb_id')
            title = tmdb.get('title') or tmdb.get('original_title')
            release_year = int(tmdb.get('release_date', '0000')[:4]) if tmdb.get('release_date') else None
            tagline = tmdb.get('tagline')
            
            # MPAA rating
            mpaa_rating = None
            if tmdb.get('release_dates', {}).get('results'):
                us = next((r for r in tmdb['release_dates']['results'] if r['iso_3166_1'] == 'US'), None)
                if us and us.get('release_dates'):
                    cert = next((rd['certification'] for rd in us['release_dates'] if rd['certification']), None)
                    mpaa_rating = cert or (us['release_dates'][0]['certification'] if us['release_dates'] else None)
            
            # Credits
            director = None
            cast_list = []
            if tmdb.get('credits'):
                crew = tmdb['credits'].get('crew', [])
                directors = [c['name'] for c in crew if c['job'] == 'Director']
                director = directors[0] if directors else None
                cast = tmdb['credits'].get('cast', [])
                cast_list = [c['name'] for c in cast[:8]]  # Top 8 cast
            
            # OMDB data for IMDB ratings
            imdb_rating = None
            imdb_votes = None
            metacritic_score = None
            if imdb_id and OMDB_API_KEY:
                omdb = fetch_omdb_data(imdb_id)
                if omdb:
                    imdb_rating = float(omdb.get('imdbRating')) if omdb.get('imdbRating') != 'N/A' else None
                    # imdbVotes arrives as a comma-grouped string, e.g. "1,234,567"
                    raw_votes = (omdb.get('imdbVotes') or '').replace(',', '')
                    imdb_votes = int(raw_votes) if raw_votes.isdigit() else None
                    metacritic_score = int(omdb.get('Metascore')) if omdb.get('Metascore') and omdb.get('Metascore').isdigit() else None
            
            # Build update data
            update_data = {
                'tmdb_id': tmdb_id,
                'imdb_id': imdb_id,
                'title': title,
                'overview': overview,
                'tagline': tagline,
                'runtime': runtime,
                'release_year': release_year,
                'mpaa_rating': mpaa_rating,
                'imdb_rating': imdb_rating,
                'imdb_votes': imdb_votes,
                'metacritic_score': metacritic_score,
                'tmdb_rating': tmdb_rating,
                'genres': genres,
                'director': director,
                'cast_list': cast_list,
                'cached_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            }
            
            # Add media enrichment data if enabled
            if ENRICH_MEDIA:
                videos = parse_videos(tmdb)
                images = parse_images(tmdb)
                watch_providers = parse_watch_providers(tmdb)
                keywords = parse_keywords(tmdb)
                similar_movies = parse_similar_movies(tmdb)
                reviews = parse_reviews(tmdb)
                backdrop_url = get_backdrop_url(tmdb)
                
                update_data.update({
                    'videos': json.dumps(videos) if videos else None,
                    'images': json.dumps(images) if images else None,
                    'watch_providers': json.dumps(watch_providers) if watch_providers else None,
                    'keywords': keywords if keywords else None,
                    'similar_movies': similar_movies if similar_movies else None,
                    'tmdb_reviews': json.dumps(reviews) if reviews else None,
                    'backdrop_url': backdrop_url,
                    'media_enriched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                })
                
                print(f"  ✓ Videos: {len(videos)}, Images: {len(images.get('backdrops', []))} backdrops, Keywords: {len(keywords)}")
            
            # Update database
            resp = supabase.table('movies').update(update_data).eq('id', movie['id']).execute()
            if not resp.data:
                print(f"  ✗ Error updating movie {movie['id']}: {resp}")
                error_count += 1
            else:
                print(f"  ✓ Successfully updated movie {movie['id']}")
                success_count += 1
                
        except Exception as e:
            print(f"  ✗ Error processing movie {movie.get('id')}: {e}")
            error_count += 1
        
        # Rate limiting delay
        time.sleep(REQUEST_DELAY)
    
    print(f"\n{'='*60}")
    print(f"Enrichment complete!")
    print(f"Success: {success_count}")
    print(f"Errors: {error_count}")
    print(f"Total processed: {len(movies)}")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
