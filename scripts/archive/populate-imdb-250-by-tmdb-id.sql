-- Populate IMDb Top 250 collection by TMDB ID (guaranteed to work)
-- Run this script in Supabase SQL Editor

DO $$
DECLARE
  collection_uuid uuid;
BEGIN
  -- Get the collection ID
  SELECT id INTO collection_uuid 
  FROM film_collections 
  WHERE slug = 'imdb-top-250';

  -- Clear existing items
  DELETE FROM film_collection_items WHERE collection_id = collection_uuid;

  -- Insert all 250 films by TMDB ID (most reliable method)
  INSERT INTO film_collection_items (collection_id, tmdb_id) VALUES
  (collection_uuid, 278),   -- The Shawshank Redemption
  (collection_uuid, 238),   -- The Godfather
  (collection_uuid, 155),   -- The Dark Knight
  (collection_uuid, 240),   -- The Godfather Part II
  (collection_uuid, 389),   -- 12 Angry Men
  (collection_uuid, 424),   -- Schindler's List
  (collection_uuid, 122),   -- The Lord of the Rings: The Return of the King
  (collection_uuid, 680),   -- Pulp Fiction
  (collection_uuid, 120),   -- The Lord of the Rings: The Fellowship of the Ring
  (collection_uuid, 429),   -- The Good, the Bad and the Ugly
  (collection_uuid, 13),    -- Forrest Gump
  (collection_uuid, 550),   -- Fight Club
  (collection_uuid, 121),   -- The Lord of the Rings: The Two Towers
  (collection_uuid, 27205), -- Inception
  (collection_uuid, 1891),  -- Star Wars: Episode V - The Empire Strikes Back
  (collection_uuid, 603),   -- The Matrix
  (collection_uuid, 769),   -- Goodfellas
  (collection_uuid, 510),   -- One Flew Over the Cuckoo's Nest
  (collection_uuid, 807),   -- Se7en
  (collection_uuid, 346),   -- Seven Samurai
  (collection_uuid, 1585),  -- It's a Wonderful Life
  (collection_uuid, 274),   -- The Silence of the Lambs
  (collection_uuid, 857),   -- Saving Private Ryan
  (collection_uuid, 157336), -- Interstellar
  (collection_uuid, 598),   -- City of God
  (collection_uuid, 637),   -- Life Is Beautiful
  (collection_uuid, 497),   -- The Green Mile
  (collection_uuid, 11),    -- Star Wars: Episode IV - A New Hope
  (collection_uuid, 280),   -- Terminator 2: Judgment Day
  (collection_uuid, 105),   -- Back to the Future
  (collection_uuid, 129),   -- Spirited Away
  (collection_uuid, 539),   -- Psycho
  (collection_uuid, 423),   -- The Pianist
  (collection_uuid, 496243), -- Parasite
  (collection_uuid, 101),   -- Léon: The Professional
  (collection_uuid, 98),    -- Gladiator
  (collection_uuid, 8587),  -- The Lion King
  (collection_uuid, 73),    -- American History X
  (collection_uuid, 1422),  -- The Departed
  (collection_uuid, 244786), -- Whiplash
  (collection_uuid, 1124),  -- The Prestige
  (collection_uuid, 629),   -- The Usual Suspects
  (collection_uuid, 289),   -- Casablanca
  (collection_uuid, 14537), -- Harakiri
  (collection_uuid, 77338), -- The Intouchables
  (collection_uuid, 112),   -- Modern Times
  (collection_uuid, 12477), -- Grave of the Fireflies
  (collection_uuid, 335),   -- Once Upon a Time in the West
  (collection_uuid, 101),   -- Rear Window
  (collection_uuid, 348),   -- Alien
  (collection_uuid, 313),   -- City Lights
  (collection_uuid, 28),    -- Apocalypse Now
  (collection_uuid, 77),    -- Memento
  (collection_uuid, 68718), -- Django Unchained
  (collection_uuid, 10681), -- WALL·E
  (collection_uuid, 582),   -- The Lives of Others
  (collection_uuid, 599),   -- Sunset Boulevard
  (collection_uuid, 975),   -- Paths of Glory
  (collection_uuid, 914),   -- The Great Dictator
  (collection_uuid, 299536), -- Avengers: Infinity War
  (collection_uuid, 37257), -- Witness for the Prosecution
  (collection_uuid, 324857), -- Spider-Man: Into the Spider-Verse
  (collection_uuid, 694),   -- The Shining
  (collection_uuid, 16869), -- Inglourious Basterds
  (collection_uuid, 935),   -- Dr. Strangelove
  (collection_uuid, 670),   -- Oldboy
  (collection_uuid, 679),   -- Aliens
  (collection_uuid, 194),   -- Amélie
  (collection_uuid, 354912), -- Coco
  (collection_uuid, 862),   -- Toy Story
  (collection_uuid, 197),   -- Braveheart
  (collection_uuid, 279),   -- Amadeus
  (collection_uuid, 387),   -- Das Boot
  (collection_uuid, 128),   -- Princess Mononoke
  (collection_uuid, 475557), -- Joker
  (collection_uuid, 299534), -- Avengers: Endgame
  (collection_uuid, 372058), -- Your Name
  (collection_uuid, 489),   -- Good Will Hunting
  (collection_uuid, 10193), -- Toy Story 3
  (collection_uuid, 20453), -- 3 Idiots
  (collection_uuid, 311),   -- Once Upon a Time in America
  (collection_uuid, 872),   -- Singin' in the Rain
  (collection_uuid, 641),   -- Requiem for a Dream
  (collection_uuid, 1892),  -- Star Wars: Episode VI - Return of the Jedi
  (collection_uuid, 62),    -- 2001: A Space Odyssey
  (collection_uuid, 517814), -- Capernaum
  (collection_uuid, 12493), -- High and Low
  (collection_uuid, 25237), -- Come and See
  (collection_uuid, 38),    -- Eternal Sunshine of the Spotless Mind
  (collection_uuid, 500),   -- Reservoir Dogs
  (collection_uuid, 15),    -- Citizen Kane
  (collection_uuid, 152578), -- The Hunt
  (collection_uuid, 301282), -- M
  (collection_uuid, 652),   -- Lawrence of Arabia
  (collection_uuid, 110),   -- Vertigo
  (collection_uuid, 546),   -- North by Northwest
  (collection_uuid, 185),   -- A Clockwork Orange
  (collection_uuid, 878),   -- Full Metal Jacket
  (collection_uuid, 595),   -- To Kill a Mockingbird
  (collection_uuid, 46738), -- Incendies
  (collection_uuid, 556574), -- Hamilton
  (collection_uuid, 949),   -- Heat
  (collection_uuid, 111),   -- Scarface
  (collection_uuid, 37136), -- The Sting
  (collection_uuid, 284),   -- The Apartment
  (collection_uuid, 89),    -- Indiana Jones and the Last Crusade
  (collection_uuid, 19),    -- Metropolis
  (collection_uuid, 14160), -- Up
  (collection_uuid, 950),   -- L.A. Confidential
  (collection_uuid, 198),   -- To Be or Not to Be
  (collection_uuid, 107),   -- Snatch
  (collection_uuid, 562),   -- Die Hard
  (collection_uuid, 3782),  -- Ikiru
  (collection_uuid, 272),   -- Batman Begins
  (collection_uuid, 218),   -- Some Like It Hot
  (collection_uuid, 10098), -- The Kid
  (collection_uuid, 600354), -- The Father
  (collection_uuid, 938),   -- For a Few Dollars More
  (collection_uuid, 43),    -- All About Eve
  (collection_uuid, 106646), -- The Wolf of Wall Street
  (collection_uuid, 490132), -- Green Book
  (collection_uuid, 821),   -- Judgment at Nuremberg
  (collection_uuid, 1542),  -- There Will Be Blood
  (collection_uuid, 697),   -- Casino
  (collection_uuid, 1417),  -- Pan's Labyrinth
  (collection_uuid, 133093), -- The Truman Show
  (collection_uuid, 11324), -- Shutter Island
  (collection_uuid, 11645), -- Ran
  (collection_uuid, 880),   -- Unforgiven
  (collection_uuid, 762),   -- Monty Python and the Holy Grail
  (collection_uuid, 613),   -- Downfall
  (collection_uuid, 19),    -- Raging Bull
  (collection_uuid, 5925),  -- The Great Escape
  (collection_uuid, 4935),  -- Howl's Moving Castle
  (collection_uuid, 24),    -- Kill Bill: Vol. 1
  (collection_uuid, 548),   -- Rashomon
  (collection_uuid, 453),   -- A Beautiful Mind
  (collection_uuid, 1092),  -- The Third Man
  (collection_uuid, 1366),  -- On the Waterfront
  (collection_uuid, 2667),  -- The Gold Rush
  (collection_uuid, 12),    -- Finding Nemo
  (collection_uuid, 72),    -- Chinatown
  (collection_uuid, 25376), -- The Secret in Their Eyes
  (collection_uuid, 5156),  -- Bicycle Thieves
  (collection_uuid, 752),   -- V for Vendetta
  (collection_uuid, 150540), -- Inside Out
  (collection_uuid, 6977),  -- No Country for Old Men
  (collection_uuid, 78),    -- Blade Runner
  (collection_uuid, 100),   -- Lock, Stock and Two Smoking Barrels
  (collection_uuid, 826),   -- The Bridge on the River Kwai
  (collection_uuid, 275),   -- Fargo
  (collection_uuid, 264644), -- Room
  (collection_uuid, 490),   -- The Seventh Seal
  (collection_uuid, 627),   -- Trainspotting
  (collection_uuid, 18148), -- Tokyo Story
  (collection_uuid, 630),   -- Gone with the Wind
  (collection_uuid, 1955),  -- The Elephant Man
  (collection_uuid, 745),   -- The Sixth Sense
  (collection_uuid, 614),   -- Wild Strawberries
  (collection_uuid, 791),   -- The General
  (collection_uuid, 5477),  -- Gran Torino
  (collection_uuid, 521),   -- Dial M for Murder
  (collection_uuid, 508439), -- Klaus
  (collection_uuid, 59440), -- Warrior
  (collection_uuid, 1979),  -- The Deer Hunter
  (collection_uuid, 146233), -- Prisoners
  (collection_uuid, 115),   -- The Big Lebowski
  (collection_uuid, 265195), -- Wild Tales
  (collection_uuid, 640),   -- Catch Me If You Can
  (collection_uuid, 1918),  -- Mr. Smith Goes to Washington
  (collection_uuid, 21334), -- Children of Heaven
  (collection_uuid, 210577), -- Gone Girl
  (collection_uuid, 120467), -- The Grand Budapest Hotel
  (collection_uuid, 11423), -- Memories of Murder
  (collection_uuid, 992),   -- Sherlock Jr.
  (collection_uuid, 766),   -- The Treasure of the Sierra Madre
  (collection_uuid, 9587),  -- Before Sunrise
  (collection_uuid, 347882), -- Hacksaw Ridge
  (collection_uuid, 10527), -- How to Train Your Dragon
  (collection_uuid, 329),   -- Jurassic Park
  (collection_uuid, 24238), -- Mary and Max
  (collection_uuid, 11878), -- Yojimbo
  (collection_uuid, 982),   -- The Best Years of Our Lives
  (collection_uuid, 290098), -- The Handmaiden
  (collection_uuid, 9080),  -- Barry Lyndon
  (collection_uuid, 7984),  -- In the Name of the Father
  (collection_uuid, 314365), -- Spotlight
  (collection_uuid, 223),   -- Rebecca
  (collection_uuid, 244),   -- 12 Years a Slave
  (collection_uuid, 204),   -- The Wages of Fear
  (collection_uuid, 1398),  -- Stalker
  (collection_uuid, 55),    -- Amores Perros
  (collection_uuid, 4576),  -- My Neighbor Totoro
  (collection_uuid, 585),   -- Monsters, Inc.
  (collection_uuid, 17295), -- The Battle of Algiers
  (collection_uuid, 147),   -- The 400 Blows
  (collection_uuid, 2567),  -- It Happened One Night
  (collection_uuid, 242582), -- Nightcrawler
  (collection_uuid, 780),   -- The Passion of Joan of Arc
  (collection_uuid, 855400), -- Jai Bhim
  (collection_uuid, 205),   -- Hotel Rwanda
  (collection_uuid, 797),   -- Persona
  (collection_uuid, 96721), -- Rush
  (collection_uuid, 263115), -- Logan
  (collection_uuid, 438631), -- Dune
  (collection_uuid, 863),   -- Platoon
  (collection_uuid, 218),   -- The Terminator
  (collection_uuid, 1979),  -- The Grapes of Wrath
  (collection_uuid, 118340), -- Guardians of the Galaxy
  (collection_uuid, 545611), -- Everything Everywhere All at Once
  (collection_uuid, 359724), -- Ford v Ferrari
  (collection_uuid, 630),   -- The Wizard of Oz
  (collection_uuid, 9552),  -- The Exorcist
  (collection_uuid, 5801),  -- Pather Panchali
  (collection_uuid, 3112),  -- The Night of the Hunter
  (collection_uuid, 1091),  -- The Thing
  (collection_uuid, 775),   -- Stand by Me
  (collection_uuid, 2026),  -- Nausicaä of the Valley of the Wind
  (collection_uuid, 19542), -- The Red Shoes
  (collection_uuid, 2062),  -- Ratatouille
  (collection_uuid, 9806),  -- The Incredibles
  (collection_uuid, 185),   -- The Maltese Falcon
  (collection_uuid, 903),   -- Cool Hand Luke
  (collection_uuid, 2636),  -- Network
  (collection_uuid, 50014), -- The Help
  (collection_uuid, 28178), -- Hachi: A Dog's Tale
  (collection_uuid, 655),   -- Paris, Texas
  (collection_uuid, 58574), -- Pirates of the Caribbean: The Curse of the Black Pearl
  (collection_uuid, 10386), -- The Iron Giant
  (collection_uuid, 207),   -- Dead Poets Society
  (collection_uuid, 851),   -- Brief Encounter
  (collection_uuid, 11216), -- Cinema Paradiso
  (collection_uuid, 895),   -- Andrei Rublev
  (collection_uuid, 508),   -- The Princess Bride
  (collection_uuid, 1580)   -- Rope
  ON CONFLICT (collection_id, tmdb_id) DO NOTHING;

  RAISE NOTICE 'Successfully populated IMDb Top 250 collection';
  
END $$;

-- Verify the count
SELECT COUNT(*) as total_films_in_collection
FROM film_collection_items fci
JOIN film_collections fc ON fci.collection_id = fc.id
WHERE fc.slug = 'imdb-top-250';
