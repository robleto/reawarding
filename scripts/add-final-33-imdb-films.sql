-- Add the final 33 missing IMDb Top 250 films
-- Run this in Supabase SQL Editor

INSERT INTO movies (tmdb_id, title, release_year) VALUES
(101, 'Léon: The Professional', 1994),
(98, 'Gladiator', 2000),
(112, 'Modern Times', 1936),
(313, 'City Lights', 1931),
(194, 'Amélie', 2001),
(152578, 'The Hunt', 2012),
(301282, 'M', 1931),
(110, 'Vertigo', 1958),
(546, 'North by Northwest', 1959),
(878, 'Full Metal Jacket', 1987),
(37136, 'The Sting', 1973),
(10098, 'The Kid', 1921),
(43, 'All About Eve', 1950),
(697, 'Casino', 1995),
(133093, 'The Truman Show', 1998),
(11645, 'Ran', 1985),
(880, 'Unforgiven', 1992),
(72, 'Chinatown', 1974),
(264644, 'Room', 2015),
(791, 'The General', 1926),
(5477, 'Gran Torino', 2008),
(1918, 'Mr. Smith Goes to Washington', 1939),
(766, 'The Treasure of the Sierra Madre', 1948),
(9587, 'Before Sunrise', 1995),
(347882, 'Hacksaw Ridge', 2016),
(982, 'The Best Years of Our Lives', 1946),
(4576, 'My Neighbor Totoro', 1988),
(2567, 'It Happened One Night', 1934),
(96721, 'Rush', 2013),
(775, 'Stand by Me', 1986),
(2026, 'Nausicaä of the Valley of the Wind', 1984),
(2636, 'Network', 1976),
(1580, 'Rope', 1948)
ON CONFLICT (tmdb_id) DO NOTHING;

-- Verify they were added
SELECT COUNT(*) as added_count FROM movies WHERE tmdb_id IN (
  101, 98, 112, 313, 194, 152578, 301282, 110, 546, 878, 37136, 10098, 43, 697,
  133093, 11645, 880, 72, 264644, 791, 5477, 1918, 766, 9587, 347882, 982, 4576,
  2567, 96721, 775, 2026, 2636, 1580
);
