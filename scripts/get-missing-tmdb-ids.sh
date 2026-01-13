#!/bin/bash

export TMDB_API_KEY=e93df744a2e8410c98f2c7ec17b7c8c9

echo "=== 7 MISSING FILMS WITH TMDB IDs ==="
echo ""
echo "Films NOT in the script (need to add to make it 50):"
echo "------------------------------------------------"
echo ""
echo "1. Despicable Me 2 (2013)"
curl -s "https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=Despicable%20Me%202&year=2013" | jq -r '"   TMDB ID: " + (.results[0].id | tostring)'
echo ""
echo "2. Bohemian Rhapsody (2018)"
curl -s "https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=Bohemian%20Rhapsody&year=2018" | jq -r '"   TMDB ID: " + (.results[0].id | tostring)'
echo ""
echo ""
echo "Films IN the script but NOT in your database:"
echo "------------------------------------------------"
echo ""
echo "3. The Lion King (2019)"
curl -s "https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=The%20Lion%20King&year=2019" | jq -r '"   TMDB ID: " + (.results[0].id | tostring)'
echo ""
echo "4. Frozen (2013)"
curl -s "https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=Frozen&year=2013" | jq -r '"   TMDB ID: " + (.results[0].id | tostring)'
echo ""
echo "5. Beauty and the Beast (2017)"
curl -s "https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=Beauty%20and%20the%20Beast&year=2017" | jq -r '"   TMDB ID: " + (.results[0].id | tostring)'
echo ""
echo "6. Aquaman (2018)"
curl -s "https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=Aquaman&year=2018" | jq -r '"   TMDB ID: " + (.results[0].id | tostring)'
echo ""
echo "7. Aladdin (2019)"
curl -s "https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=Aladdin&year=2019" | jq -r '"   TMDB ID: " + (.results[0].id | tostring)'
echo ""
