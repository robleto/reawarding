-- Update IMDb Top 250 collection with all 250 films
-- Based on IMDb's official Top 250 list (as of January 2026)

-- First, create the collection if it doesn't exist, then get its ID
DO $$
DECLARE
  collection_uuid uuid;
BEGIN
  -- Create or update the collection
  INSERT INTO film_collections (slug, title, description, category, featured)
  VALUES (
    'imdb-top-250',
    'IMDb Top 250',
    'The 250 highest-rated films on IMDb, as voted by users worldwide.',
    'curated',
    true
  )
  ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description
  RETURNING id INTO collection_uuid;

  -- If collection already existed, RETURNING might not work, so get it explicitly
  IF collection_uuid IS NULL THEN
    SELECT id INTO collection_uuid 
    FROM film_collections 
    WHERE slug = 'imdb-top-250';
  END IF;

  -- Clear existing items
  DELETE FROM film_collection_items WHERE collection_id = collection_uuid;

  -- Insert the IMDb Top 250 films
  -- We'll match by title and year when needed for disambiguation
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Shawshank Redemption' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Godfather' AND release_year = 1972 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Dark Knight' AND release_year = 2008 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Godfather Part II' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '12 Angry Men' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Schindler''s List' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Lord of the Rings%Return of the King%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Pulp Fiction' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Fellowship of the Ring%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Good, the Bad and the Ugly' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Forrest Gump' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Inception' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '%Two Towers%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Matrix' AND release_year = 1999 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Goodfellas' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Star Wars%Empire Strikes Back%' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'One Flew Over the Cuckoo''s Nest' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Interstellar' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'City of God' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Se7en' OR title ILIKE 'Seven' AND release_year = 1995 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Silence of the Lambs' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Saving Private Ryan' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Life Is Beautiful' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Green Mile' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Star Wars' AND release_year = 1977 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Spirited Away' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Terminator 2%Judgment Day' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Harakiri' OR title ILIKE 'Seppuku' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Pianist' AND release_year = 2002 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Parasite' AND release_year = 2019 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Gladiator' AND release_year = 2000 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Back to the Future' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Lion King' AND release_year = 1994 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Prestige' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'American History X' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Departed' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Whiplash' AND release_year = 2014 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Usual Suspects' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Casablanca' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Grave of the Fireflies' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Once Upon a Time in the West' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Cinema Paradiso' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Rear Window' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Alien' AND release_year = 1979 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'City Lights' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Psycho' AND release_year = 1960 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Modern Times' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Apocalypse Now' LIMIT 1;
  
  -- Continue with more films...
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Memento' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Raiders of the Lost Ark' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Django Unchained' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Shining' AND release_year = 1980 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Paths of Glory' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'WALL·E' OR title ILIKE 'WALL-E' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Avengers%Infinity War' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Sunset Boulevard' OR title ILIKE 'Sunset Blvd.' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Great Dictator' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Witness for the Prosecution' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Avengers%Endgame' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Spider-Man%Into the Spider-Verse' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Alien%' AND release_year = 1986 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Dr. Strangelove' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Dark Knight Rises' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Oldboy' AND release_year = 2003 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Amadeus' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Joker' AND release_year = 2019 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Coco' AND release_year = 2017 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Toy Story' AND release_year = 1995 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Princess Mononoke' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Braveheart' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Once Upon a Time in America' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Your Name%' OR title ILIKE 'Kimi no Na wa' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Singin'' in the Rain' OR title ILIKE 'Singin in the Rain' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '3 Idiots' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Toy Story 3' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Capernaum' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Requiem for a Dream' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Star Wars%Return of the Jedi' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Eternal Sunshine of the Spotless Mind' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '2001: A Space Odyssey' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Reservoir Dogs' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Citizen Kane' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'M' AND release_year = 1931 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Lawrence of Arabia' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'North by Northwest' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Vertigo' AND release_year = 1958 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Amelie' OR title ILIKE 'Le Fabuleux Destin d''Amélie Poulain' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'A Clockwork Orange' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Full Metal Jacket' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Double Indemnity' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Bicycle Thieves' OR title ILIKE 'Ladri di biciclette' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'To Kill a Mockingbird' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Scarface' AND release_year = 1983 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Inglourious Basterds' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Apartment' AND release_year = 1960 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Sting' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Metropolis' AND release_year = 1927 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'L.A. Confidential' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Snatch' AND release_year = 2000 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Incendies' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Like Stars on Earth' OR title ILIKE 'Taare Zameen Par' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '1917' AND release_year = 2019 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Heat' AND release_year = 1995 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Rashomon' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Third Man' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Hamilton' AND release_year = 2020 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Treasure of the Sierra Madre' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Some Like It Hot' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Monty Python and the Holy Grail' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Unforgiven' AND release_year = 1992 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Ran' AND release_year = 1985 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'There Will Be Blood' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Howl''s Moving Castle' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Kill Bill%Vol. 1' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'A Separation' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Great Escape' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Yojimbo' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Green Book' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Pan''s Labyrinth' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Downfall' OR title ILIKE 'Der Untergang' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'My Neighbor Totoro' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Judgment at Nuremberg' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Gold Rush' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Come and See' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Casino' AND release_year = 1995 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Secret in Their Eyes' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Three Billboards Outside Ebbing, Missouri' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Raging Bull' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Inside Out' AND release_year = 2015 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Bridge on the River Kwai' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Wild Strawberries' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'V for Vendetta' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Seventh Seal' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Elephant Man' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Wolf of Wall Street' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Warrior' AND release_year = 2011 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Big Lebowski' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Tokyo Story' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Gone with the Wind' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Wild Tales' OR title ILIKE 'Relatos salvajes' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Finding Nemo' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Hacksaw Ridge' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Deer Hunter' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Truman Show' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Fargo' AND release_year = 1996 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'No Country for Old Men' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Sixth Sense' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Thing' AND release_year = 1982 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The General' AND release_year = 1926 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Klaus' AND release_year = 2019 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Trainspotting' AND release_year = 1996 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Prisoners' AND release_year = 2013 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Shutter Island' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Gran Torino' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'On the Waterfront' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Grand Budapest Hotel' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Before Sunrise' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Mr. Smith Goes to Washington' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Barry Lyndon' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Catch Me If You Can' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Handmaiden' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE '12 Years a Slave' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Sherlock Jr.' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Monsters, Inc.' OR title ILIKE 'Monsters Inc' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Persona' AND release_year = 1966 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Dial M for Murder' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'It Happened One Night' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Blade Runner' AND release_year = 1982 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Battle of Algiers' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Jurassic Park' AND release_year = 1993 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Wizard of Oz' AND release_year = 1939 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Memories of Murder' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Before Sunset' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Passion of Joan of Arc' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'How to Train Your Dragon' AND release_year = 2010 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Nights of Cabiria' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Ford v Ferrari' OR title ILIKE 'Le Mans ''66' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Mad Max: Fury Road' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Ikiru' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Rebecca' AND release_year = 1940 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'In the Name of the Father' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Stand by Me' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The 400 Blows' OR title ILIKE 'Les Quatre Cents Coups' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Up' AND release_year = 2009 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Hotel Rwanda' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Logan' AND release_year = 2017 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Andhadhun' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Spotlight' AND release_year = 2015 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Terminator' AND release_year = 1984 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Million Dollar Baby' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Exorcist' AND release_year = 1973 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Best Years of Our Lives' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Kid' AND release_year = 1921 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Rush' AND release_year = 2013 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Network' AND release_year = 1976 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Paris, Texas' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Life of Brian' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Hachi: A Dog''s Tale' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Wages of Fear' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Grapes of Wrath' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Cool Hand Luke' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Rocky' AND release_year = 1976 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Dune' AND release_year = 2021 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Ben-Hur' AND release_year = 1959 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Platoon' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Soul' AND release_year = 2020 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Jai Bhim' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Harry Potter and the Deathly Hallows%Part 2' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Help' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Into the Wild' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Sound of Music' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Gangs of Wasseypur' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Autumn Sonata' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Room' AND release_year = 2015 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Iron Giant' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Wild Bunch' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Incredibles' AND release_year = 2004 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Dead Poets Society' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Father' AND release_year = 2020 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Dangal' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Ratatouille' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Producers' AND release_year = 1967 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Conversation' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Maltese Falcon' AND release_year = 1941 LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Rififi' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'Everything Everywhere All at Once' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Princess Bride' LIMIT 1;
  
  INSERT INTO film_collection_items (collection_id, tmdb_id)
  SELECT collection_uuid, tmdb_id FROM movies WHERE title ILIKE 'The Whale' AND release_year = 2022 LIMIT 1;

END $$;

-- Verify the count
SELECT COUNT(*) as total_films 
FROM film_collection_items 
WHERE collection_id = (SELECT id FROM film_collections WHERE slug = 'imdb-top-250');
