-- Update Top 50 Grossing All-Time collection with correct films
-- Based on worldwide box office (not adjusted for inflation)

-- First, get the collection ID
DO $$
DECLARE
  collection_uuid uuid;
BEGIN
  -- Get the collection ID
  SELECT id INTO collection_uuid 
  FROM film_collections 
  WHERE slug = 'top-50-grossing-all-time';

  -- Clear existing items
  DELETE FROM film_collection_items WHERE collection_id = collection_uuid;

  -- Insert the actual top 50 highest-grossing films
  -- We'll match by title since we need to find the TMDB IDs in your database
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Avatar' AND release_year = 2009 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Avengers: Endgame' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Avatar: The Way of Water' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Titanic' AND release_year = 1997 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Force Awakens%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Avengers: Infinity War' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Spider-Man: No Way Home' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Jurassic World' AND release_year = 2015 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Lion King' AND release_year = 2019 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Avengers' AND release_year = 2012 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Furious 7' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Top Gun: Maverick' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Frozen II' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Barbie' AND release_year = 2023 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Avengers: Age of Ultron' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Super Mario Bros%' AND release_year = 2023 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Black Panther' AND release_year = 2018 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Deathly Hallows%Part 2%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Last Jedi%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Jurassic World: Fallen Kingdom' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Frozen' AND release_year = 2013 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Beauty and the Beast' AND release_year = 2017 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Incredibles 2' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Fate of the Furious' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Iron Man 3' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Minions' AND release_year = 2015 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Captain America: Civil War' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Aquaman' AND release_year = 2018 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Return of the King%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Spider-Man: Far From Home' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Captain Marvel' AND release_year = 2019 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Skyfall%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Transformers: Dark of the Moon%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Joker' AND release_year = 2019 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Rise of Skywalker%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Toy Story 4' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Toy Story 3' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Pirates of the Caribbean: Dead Man%s Chest' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Rogue One%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Aladdin' AND release_year = 2019 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Finding Dory%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Star Wars%Phantom Menace%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Despicable Me 3' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Dark Knight Rises' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Dark Knight' AND release_year = 2008 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Deathly Hallows%Part 1%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Inside Out 2' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Deadpool & Wolverine' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Despicable Me 2' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Bohemian Rhapsody' LIMIT 1;

END $$;

-- Verify the count
SELECT COUNT(*) as total_films 
FROM film_collection_items 
WHERE collection_id = (SELECT id FROM film_collections WHERE slug = 'top-50-grossing-all-time');
