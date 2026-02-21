-- Check which top 50 grossing films are missing from the database

-- Check each film individually
SELECT 'Avatar (2009)' as film, EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Avatar' AND release_year = 2009) as found
UNION ALL
SELECT 'Avengers: Endgame', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Avengers: Endgame')
UNION ALL
SELECT 'Avatar: The Way of Water', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Avatar: The Way of Water')
UNION ALL
SELECT 'Titanic (1997)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Titanic' AND release_year = 1997)
UNION ALL
SELECT 'Star Wars: The Force Awakens', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Force Awakens%')
UNION ALL
SELECT 'Avengers: Infinity War', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Avengers: Infinity War')
UNION ALL
SELECT 'Spider-Man: No Way Home', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Spider-Man: No Way Home')
UNION ALL
SELECT 'Jurassic World (2015)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Jurassic World' AND release_year = 2015)
UNION ALL
SELECT 'The Lion King (2019)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'The Lion King' AND release_year = 2019)
UNION ALL
SELECT 'The Avengers (2012)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'The Avengers' AND release_year = 2012)
UNION ALL
SELECT 'Furious 7', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Furious 7')
UNION ALL
SELECT 'Top Gun: Maverick', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Top Gun: Maverick')
UNION ALL
SELECT 'Frozen II', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Frozen II')
UNION ALL
SELECT 'Barbie (2023)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Barbie' AND release_year = 2023)
UNION ALL
SELECT 'Avengers: Age of Ultron', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Avengers: Age of Ultron')
UNION ALL
SELECT 'The Super Mario Bros. Movie (2023)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Super Mario Bros%' AND release_year = 2023)
UNION ALL
SELECT 'Black Panther (2018)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Black Panther' AND release_year = 2018)
UNION ALL
SELECT 'Harry Potter: Deathly Hallows Part 2', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Deathly Hallows%Part 2%')
UNION ALL
SELECT 'Star Wars: The Last Jedi', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Last Jedi%')
UNION ALL
SELECT 'Jurassic World: Fallen Kingdom', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Jurassic World: Fallen Kingdom')
UNION ALL
SELECT 'Frozen (2013)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Frozen' AND release_year = 2013)
UNION ALL
SELECT 'Beauty and the Beast (2017)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Beauty and the Beast' AND release_year = 2017)
UNION ALL
SELECT 'Incredibles 2', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Incredibles 2')
UNION ALL
SELECT 'The Fate of the Furious', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'The Fate of the Furious')
UNION ALL
SELECT 'Iron Man 3', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Iron Man 3')
UNION ALL
SELECT 'Minions (2015)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Minions' AND release_year = 2015)
UNION ALL
SELECT 'Captain America: Civil War', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Captain America: Civil War')
UNION ALL
SELECT 'Aquaman (2018)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Aquaman' AND release_year = 2018)
UNION ALL
SELECT 'Lord of the Rings: Return of the King', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Return of the King%')
UNION ALL
SELECT 'Spider-Man: Far From Home', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Spider-Man: Far From Home')
UNION ALL
SELECT 'Captain Marvel (2019)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Captain Marvel' AND release_year = 2019)
UNION ALL
SELECT 'Skyfall', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Skyfall%')
UNION ALL
SELECT 'Transformers: Dark of the Moon', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Transformers: Dark of the Moon%')
UNION ALL
SELECT 'Joker (2019)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Joker' AND release_year = 2019)
UNION ALL
SELECT 'Star Wars: Rise of Skywalker', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Rise of Skywalker%')
UNION ALL
SELECT 'Toy Story 4', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Toy Story 4')
UNION ALL
SELECT 'Toy Story 3', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Toy Story 3')
UNION ALL
SELECT 'Pirates: Dead Man''s Chest', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Pirates of the Caribbean: Dead Man%s Chest')
UNION ALL
SELECT 'Rogue One', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Rogue One%')
UNION ALL
SELECT 'Aladdin (2019)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Aladdin' AND release_year = 2019)
UNION ALL
SELECT 'Finding Dory', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Finding Dory%')
UNION ALL
SELECT 'Star Wars: Phantom Menace', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Star Wars%Phantom Menace%')
UNION ALL
SELECT 'Despicable Me 3', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Despicable Me 3')
UNION ALL
SELECT 'The Dark Knight Rises', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'The Dark Knight Rises')
UNION ALL
SELECT 'The Dark Knight (2008)', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'The Dark Knight' AND release_year = 2008)
UNION ALL
SELECT 'Harry Potter: Deathly Hallows Part 1', EXISTS(SELECT 1 FROM movies WHERE title ILIKE '%Deathly Hallows%Part 1%')
UNION ALL
SELECT 'Inside Out 2', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Inside Out 2')
UNION ALL
SELECT 'Deadpool & Wolverine', EXISTS(SELECT 1 FROM movies WHERE title ILIKE 'Deadpool & Wolverine')
ORDER BY found, film;
