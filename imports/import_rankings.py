import os
import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv("../.env.local")  # 👈 Load local development environment

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role key to bypass RLS
USER_ID = "45d902c9-d56a-4589-8932-9e25b6eeec30"  # Replace with your Supabase user ID
CSV_PATH = "user_rankings.csv"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def main():
    df = pd.read_csv(CSV_PATH)

    for _, row in df.iterrows():
        tmdb_id_raw = row.get("TMDB_ID")
        seen_it = row.get("Seen It", "").strip().lower() == "yes"
        ranking = row.get("Ranking")
        
        if pd.isna(tmdb_id_raw) or pd.isna(ranking):
            continue
        
        # Convert TMDB ID to integer (handles cases like "14906.0")
        try:
            tmdb_id = int(float(str(tmdb_id_raw).strip()))
        except (ValueError, TypeError):
            print(f"❌ Invalid TMDB_ID: {tmdb_id_raw}")
            continue
        
        # Find the movie ID from Supabase based on TMDB_ID
        query = f"{SUPABASE_URL}/rest/v1/movies?select=id&tmdb_id=eq.{tmdb_id}"
        res = requests.get(query, headers=headers)
        if res.status_code != 200 or not res.json():
            print(f"❌ Movie not found for TMDB_ID {tmdb_id}")
            continue

        movie_id = res.json()[0]["id"]

        # Upsert the user's ranking
        payload = {
            "user_id": USER_ID,
            "movie_id": movie_id,
            "seen_it": seen_it,
            "ranking": int(ranking),
        }
        insert_url = f"{SUPABASE_URL}/rest/v1/rankings?on_conflict=movie_id,user_id"
        response = requests.post(insert_url, headers=headers, json=payload)

        if response.status_code in [200, 201]:
            print(f"✅ Upserted {movie_id} with rank {ranking}")
        else:
            print(f"❌ Error: {response.text}")

if __name__ == "__main__":
    main()
