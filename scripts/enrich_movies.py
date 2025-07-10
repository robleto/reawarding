import os
import time
import requests
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
OMDB_API_KEY = os.environ.get('OMDB_API_KEY')
REQUEST_DELAY = float(os.environ.get('REQUEST_DELAY', '0.3'))  # seconds
LIMIT = int(os.environ.get('LIMIT', '1900'))

if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY]):
    raise Exception('Missing required environment variables.')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def fetch_tmdb_data(tmdb_id):
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}&append_to_response=credits,external_ids,release_dates"
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

def main():
    # Get all movies that have not been TMDB-enriched (overview IS NULL)
    movies = supabase.table('movies').select('id, tmdb_id').is_('overview', None).limit(LIMIT).execute().data
    print(f"Found {len(movies)} movies to update")
    for movie in movies:
        tmdb_id = movie.get('tmdb_id')
        if not tmdb_id:
            print(f"Skipping movie with missing tmdb_id. Movie ID: {movie.get('id')}")
            continue
        try:
            tmdb = fetch_tmdb_data(tmdb_id)
            overview = tmdb.get('overview')
            runtime = tmdb.get('runtime')
            tmdb_rating = tmdb.get('vote_average')
            genres = [g['name'] for g in tmdb.get('genres', [])]
            imdb_id = tmdb.get('external_ids', {}).get('imdb_id') or tmdb.get('imdb_id')
            title = tmdb.get('title') or tmdb.get('original_title')
            release_year = int(tmdb.get('release_date', '0000')[:4]) if tmdb.get('release_date') else None
            mpaa_rating = None
            if tmdb.get('release_dates', {}).get('results'):
                us = next((r for r in tmdb['release_dates']['results'] if r['iso_3166_1'] == 'US'), None)
                if us and us.get('release_dates'):
                    cert = next((rd['certification'] for rd in us['release_dates'] if rd['certification']), None)
                    mpaa_rating = cert or (us['release_dates'][0]['certification'] if us['release_dates'] else None)
            director = None
            cast_list = []
            if tmdb.get('credits'):
                crew = tmdb['credits'].get('crew', [])
                directors = [c['name'] for c in crew if c['job'] == 'Director']
                director = directors[0] if directors else None
                cast = tmdb['credits'].get('cast', [])
                cast_list = [c['name'] for c in cast[:5]]
            imdb_rating = None
            metacritic_score = None
            if imdb_id and OMDB_API_KEY:
                omdb = fetch_omdb_data(imdb_id)
                if omdb:
                    imdb_rating = float(omdb.get('imdbRating')) if omdb.get('imdbRating') else None
                    metacritic_score = int(omdb.get('Metascore')) if omdb.get('Metascore') and omdb.get('Metascore').isdigit() else None
            update_data = {
                'tmdb_id': tmdb_id,
                'imdb_id': imdb_id,
                'title': title,
                'overview': overview,
                'runtime': runtime,
                'release_year': release_year,
                'mpaa_rating': mpaa_rating,
                'imdb_rating': imdb_rating,
                'metacritic_score': metacritic_score,
                'tmdb_rating': tmdb_rating,
                'genres': genres,
                'director': director,
                'cast_list': cast_list,
                'cached_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            }
            resp = supabase.table('movies').update(update_data).eq('id', movie['id']).execute()
            if not resp.data:
                print(f"Error updating movie {movie['id']}: {resp}")
            else:
                print(f"Successfully updated movie {movie['id']}")
        except Exception as e:
            print(f"Error processing movie {movie.get('id')}: {e}")
        time.sleep(REQUEST_DELAY)

if __name__ == '__main__':
    main()
