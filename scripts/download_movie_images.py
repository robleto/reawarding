import os
import requests
import re
from supabase import create_client, Client
from dotenv import load_dotenv

# --- CONFIG ---
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
POSTERS_DIR = "public/posters"
THUMBS_DIR = "public/thumbs"

load_dotenv()

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def download_image(url, path):
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        with open(path, 'wb') as f:
            f.write(r.content)
        print(f"Downloaded: {path}")
    except Exception as e:
        print(f"Failed to download {url}: {e}")

def main():
    os.makedirs(POSTERS_DIR, exist_ok=True)
    os.makedirs(THUMBS_DIR, exist_ok=True)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    movies = supabase.table("movies").select("id,title,release_year,poster_url,thumb_url").execute().data

    for movie in movies:
        slug = slugify(f"{movie['title']}-{movie['release_year']}")
        # Poster
        if movie.get("poster_url"):
            poster_path = os.path.join(POSTERS_DIR, f"{slug}.jpg")
            download_image(movie["poster_url"], poster_path)
        # Thumb
        if movie.get("thumb_url"):
            thumb_path = os.path.join(THUMBS_DIR, f"{slug}.jpg")
            download_image(movie["thumb_url"], thumb_path)

if __name__ == "__main__":
    main()