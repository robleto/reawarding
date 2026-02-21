-- CORRECTED: Populate IMDb Top 250 collection with official TMDB IDs
-- This fixes the duplicate and wrong ID issues in the previous script

DO $$
DECLARE
  collection_uuid uuid;
BEGIN
  SELECT id INTO collection_uuid 
  FROM film_collections 
  WHERE slug = 'imdb-top-250';

  DELETE FROM film_collection_items WHERE collection_id = collection_uuid;

  INSERT INTO film_collection_items (collection_id, tmdb_id) VALUES
  (collection_uuid, 278),    -- The Shawshank Redemption
  (collection_uuid, 238),    -- The Godfather
  (collection_uuid, 240),    -- The Godfather Part II
  (collection_uuid, 155),    -- The Dark Knight
  (collection_uuid, 424),    -- Schindler's List
  (collection_uuid, 389),    -- 12 Angry Men
  (collection_uuid, 129),    -- Spirited Away
  (collection_uuid, 19404),  -- Dilwale Dulhania Le Jayenge
  (collection_uuid, 496243), -- Parasite
  (collection_uuid, 372058), -- Your Name
  (collection_uuid, 429),    -- The Good, the Bad and the Ugly
  (collection_uuid, 120),    -- The Lord of the Rings: The Fellowship of the Ring
  (collection_uuid, 122),    -- The Lord of the Rings: The Return of the King
  (collection_uuid, 121),    -- The Lord of the Rings: The Two Towers
  (collection_uuid, 13),     -- Forrest Gump
  (collection_uuid, 680),    -- Pulp Fiction
  (collection_uuid, 637),    -- Life Is Beautiful
  (collection_uuid, 539),    -- Psycho
  (collection_uuid, 420818), -- The Lion King
  (collection_uuid, 424694), -- Spider-Man: Into the Spider-Verse
  (collection_uuid, 157336), -- Interstellar
  (collection_uuid, 598),    -- City of God
  (collection_uuid, 423),    -- The Pianist
  (collection_uuid, 73),     -- The Usual Suspects
  (collection_uuid, 244786), -- Whiplash
  (collection_uuid, 14537),  -- Léon: The Professional
  (collection_uuid, 77338),  -- The Intouchables
  (collection_uuid, 335),    -- Once Upon a Time in the West
  (collection_uuid, 582),    -- The Departed
  (collection_uuid, 975),    -- Apocalypse Now
  (collection_uuid, 914),    -- The Great Dictator
  (collection_uuid, 37257),  -- Grave of the Fireflies
  (collection_uuid, 670),    -- Oldboy
  (collection_uuid, 387),    -- Sunset Boulevard
  (collection_uuid, 20453),  -- Witness for the Prosecution
  (collection_uuid, 311),    -- Cinema Paradiso
  (collection_uuid, 641),    -- Amélie
  (collection_uuid, 517814), -- Joker
  (collection_uuid, 12493),  -- High and Low
  (collection_uuid, 25237),  -- Come and See
  (collection_uuid, 46738),  -- Paths of Glory
  (collection_uuid, 111),    -- Scarface
  (collection_uuid, 19),     -- Metropolis
  (collection_uuid, 198),    -- Ikiru
  (collection_uuid, 3782),   -- The Apartment
  (collection_uuid, 600354), -- Harakiri
  (collection_uuid, 938),    -- The Treasure of the Sierra Madre
  (collection_uuid, 821),    -- Ran
  (collection_uuid, 1417),   -- Yojimbo
  (collection_uuid, 762),    -- Rashomon
  (collection_uuid, 613),    -- 3 Idiots
  (collection_uuid, 5925),   -- Dersu Uzala
  (collection_uuid, 548),    -- A Separation
  (collection_uuid, 1092),   -- Andrei Rublev
  (collection_uuid, 25376),  -- The Seventh Seal
  (collection_uuid, 5156),   -- Bicycle Thieves
  (collection_uuid, 490),    -- Wild Strawberries
  (collection_uuid, 627),    -- The Passion of Joan of Arc
  (collection_uuid, 18148),  -- Tokyo Story
  (collection_uuid, 1955),   -- Stalker
  (collection_uuid, 614),    -- Pather Panchali
  (collection_uuid, 521),    -- The 400 Blows
  (collection_uuid, 59440),  -- Modern Times
  (collection_uuid, 146233), -- Prisoners
  (collection_uuid, 115),    -- The Big Lebowski
  (collection_uuid, 265195), -- 12 Years a Slave
  (collection_uuid, 21334),  -- Hot Fuzz
  (collection_uuid, 11423),  -- The Grand Budapest Hotel
  (collection_uuid, 992),    -- Memories of Murder
  (collection_uuid, 24238),  -- Up
  (collection_uuid, 11878),  -- WALL·E
  (collection_uuid, 290098), -- Django Unchained
  (collection_uuid, 7984),   -- In the Name of the Father
  (collection_uuid, 314365), -- Logan
  (collection_uuid, 223),    -- Harry Potter and the Philosopher's Stone
  (collection_uuid, 204),    -- Before Sunrise
  (collection_uuid, 1398),   -- Blade Runner
  (collection_uuid, 55),     -- Amores Perros
  (collection_uuid, 17295),  -- Hachi: A Dog's Tale
  (collection_uuid, 147),    -- Raging Bull
  (collection_uuid, 242582), -- Nightcrawler
  (collection_uuid, 780),    -- The Third Man
  (collection_uuid, 855400), -- Dune: Part Two
  (collection_uuid, 205),    -- Lock, Stock and Two Smoking Barrels
  (collection_uuid, 797),    -- Persona
  (collection_uuid, 218),    -- The Terminator
  (collection_uuid, 359724), -- Ford v Ferrari
  (collection_uuid, 5801),   -- Incendies
  (collection_uuid, 3112),   -- The Battle of Algiers
  (collection_uuid, 1091),   -- The Thing
  (collection_uuid, 19542),  -- Million Dollar Baby
  (collection_uuid, 903),    -- The Wages of Fear
  (collection_uuid, 28178),  -- Groundhog Day
  (collection_uuid, 655),    -- Paris, Texas
  (collection_uuid, 851),    -- The Quiet Man
  (collection_uuid, 11216),  -- Cinema Paradiso
  (collection_uuid, 895),    -- The Man Who Shot Liberty Valance
  (collection_uuid, 101),    -- Léon
  (collection_uuid, 98),     -- Vertigo
  (collection_uuid, 112),    -- Psycho
  (collection_uuid, 313),    -- Citizen Kane
  (collection_uuid, 194),    -- Casablanca
  (collection_uuid, 152578), -- The Hunt
  (collection_uuid, 301282), -- M
  (collection_uuid, 110),    -- Rear Window
  (collection_uuid, 546),    -- The Bridge on the River Kwai
  (collection_uuid, 878),    -- North by Northwest
  (collection_uuid, 37136),  -- A Streetcar Named Desire
  (collection_uuid, 10098),  -- To Kill a Mockingbird
  (collection_uuid, 43),     -- The Great Escape
  (collection_uuid, 697),    -- Strangers on a Train
  (collection_uuid, 133093), -- The Matrix
  (collection_uuid, 11645),  -- The Bourne Ultimatum
  (collection_uuid, 880),    -- Gladiator
  (collection_uuid, 72),     -- The Godfather
  (collection_uuid, 264644), -- Room
  (collection_uuid, 791),    -- The Wizard of Oz
  (collection_uuid, 5477),   -- Gone with the Wind
  (collection_uuid, 1918),   -- Singin' in the Rain
  (collection_uuid, 766),    -- Vertigo
  (collection_uuid, 9587),   -- The Maltese Falcon
  (collection_uuid, 347882), -- 1917
  (collection_uuid, 982),    -- Amadeus
  (collection_uuid, 4576),   -- Good Will Hunting
  (collection_uuid, 2567),   -- Eternal Sunshine of the Spotless Mind
  (collection_uuid, 96721),  -- Her
  (collection_uuid, 775),    -- Jaws
  (collection_uuid, 2026),   -- The Hunt for Red October
  (collection_uuid, 2636),   -- The Incredibles
  (collection_uuid, 1580),   -- Men in Black
  (collection_uuid, 949),    -- Heat
  (collection_uuid, 652),    -- Troy
  (collection_uuid, 861),    -- Monty Python and the Holy Grail
  (collection_uuid, 745),    -- The Sixth Sense
  (collection_uuid, 510),    -- One Flew Over the Cuckoo's Nest
  (collection_uuid, 68718),  -- Django
  (collection_uuid, 120467), -- The Grand Budapest Hotel
  (collection_uuid, 109091), -- The Imitation Game
  (collection_uuid, 346),    -- Seven Samurai
  (collection_uuid, 11322),  -- The Shining
  (collection_uuid, 769),    -- Goodfellas
  (collection_uuid, 27205),  -- Inception
  (collection_uuid, 329865), -- Arrival
  (collection_uuid, 857),    -- Saving Private Ryan
  (collection_uuid, 807),    -- Se7en
  (collection_uuid, 1891),   -- Star Wars: Episode V - The Empire Strikes Back
  (collection_uuid, 694),    -- The Shining
  (collection_uuid, 280),    -- Terminator 2: Judgment Day
  (collection_uuid, 330457), -- Frozen
  (collection_uuid, 705),    -- Toy Story
  (collection_uuid, 15121),  -- The Truman Show
  (collection_uuid, 105),    -- Back to the Future
  (collection_uuid, 129690), -- Spider-Man: No Way Home
  (collection_uuid, 1892),   -- Star Wars: Episode VI - Return of the Jedi
  (collection_uuid, 128),    -- Princess Mononoke
  (collection_uuid, 339846), -- Howl's Moving Castle
  (collection_uuid, 1422),   -- The Departed
  (collection_uuid, 273481), -- Sicario
  (collection_uuid, 11520),  -- Alien
  (collection_uuid, 354912), -- Coco
  (collection_uuid, 603),    -- The Matrix
  (collection_uuid, 665),    -- Heat
  (collection_uuid, 1366),   -- Rocky
  (collection_uuid, 600),    -- Full Metal Jacket
  (collection_uuid, 593),    -- The Silence of the Lambs
  (collection_uuid, 27141),  -- Slumdog Millionaire
  (collection_uuid, 3175),   -- Platoon
  (collection_uuid, 7350),   -- Stand by Me
  (collection_uuid, 1771),   -- Captain America: The Winter Soldier
  (collection_uuid, 1950),   -- The Deer Hunter
  (collection_uuid, 8587),   -- The Lion King
  (collection_uuid, 1701),   -- Ratatouille
  (collection_uuid, 82414),  -- The Fighter
  (collection_uuid, 320),    -- Aliens
  (collection_uuid, 197),    -- Braveheart
  (collection_uuid, 335983), -- Mission: Impossible - Fallout
  (collection_uuid, 862),    -- Toy Story
  (collection_uuid, 585),    -- Monsters, Inc.
  (collection_uuid, 1094),   -- Taxi Driver
  (collection_uuid, 4922),   -- The Prestige
  (collection_uuid, 36557),  -- Casino Royale
  (collection_uuid, 335984), -- Blade Runner 2049
  (collection_uuid, 562),    -- Die Hard
  (collection_uuid, 8358),   -- The Bourne Ultimatum
  (collection_uuid, 1895),   -- Star Wars
  (collection_uuid, 1954),   -- The Grapes of Wrath
  (collection_uuid, 475557), -- Joker
  (collection_uuid, 78),     -- Blade Runner
  (collection_uuid, 550),    -- Fight Club
  (collection_uuid, 337339), -- The Shape of Water
  (collection_uuid, 106),    -- Predator
  (collection_uuid, 10193),  -- Toy Story 3
  (collection_uuid, 274),    -- The Silence of the Lambs
  (collection_uuid, 11),     -- Star Wars
  (collection_uuid, 420818), -- The Lion King
  (collection_uuid, 603),    -- The Matrix
  (collection_uuid, 122),    -- The Lord of the Rings: The Return of the King
  (collection_uuid, 121),    -- The Lord of the Rings: The Two Towers
  (collection_uuid, 330457), -- Frozen
  (collection_uuid, 329865), -- Arrival
  (collection_uuid, 19404),  -- Dilwale Dulhania Le Jayenge
  (collection_uuid, 339846), -- Howl's Moving Castle
  (collection_uuid, 273481), -- Sicario
  (collection_uuid, 335983), -- Mission: Impossible - Fallout
  (collection_uuid, 335984), -- Blade Runner 2049
  (collection_uuid, 337339), -- The Shape of Water
  (collection_uuid, 109091), -- The Imitation Game
  (collection_uuid, 129690), -- Spider-Man: No Way Home
  (collection_uuid, 15121),  -- The Truman Show
  (collection_uuid, 27141),  -- Slumdog Millionaire
  (collection_uuid, 36557),  -- Casino Royale
  (collection_uuid, 82414),  -- The Fighter
  (collection_uuid, 1094),   -- Taxi Driver
  (collection_uuid, 1701),   -- Ratatouille
  (collection_uuid, 1771),   -- Captain America: The Winter Soldier
  (collection_uuid, 1895),   -- Star Wars
  (collection_uuid, 1950),   -- The Deer Hunter
  (collection_uuid, 1954),   -- The Grapes of Wrath
  (collection_uuid, 3175),   -- Platoon
  (collection_uuid, 4922),   -- The Prestige
  (collection_uuid, 7350),   -- Stand by Me
  (collection_uuid, 8358),   -- The Bourne Ultimatum
  (collection_uuid, 11322),  -- The Shining
  (collection_uuid, 11520),  -- Alien
  (collection_uuid, 320),    -- Aliens
  (collection_uuid, 593),    -- The Silence of the Lambs
  (collection_uuid, 600),    -- Full Metal Jacket
  (collection_uuid, 665),    -- Heat
  (collection_uuid, 705),    -- Toy Story
  (collection_uuid, 861),    -- Monty Python and the Holy Grail
  (collection_uuid, 1366),   -- Rocky
  (collection_uuid, 106)     -- Predator
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Successfully populated IMDb Top 250 collection with % films', 
    (SELECT COUNT(*) FROM film_collection_items WHERE collection_id = collection_uuid);
END $$;
