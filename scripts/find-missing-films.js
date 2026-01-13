// Quick script to check which films from the top 50 list are missing
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const filmsToCheck = [
  { name: 'Avatar (2009)', pattern: 'Avatar', year: 2009 },
  { name: 'Avengers: Endgame', pattern: 'Avengers: Endgame', year: null },
  { name: 'Avatar: The Way of Water', pattern: 'Avatar: The Way of Water', year: null },
  { name: 'Titanic (1997)', pattern: 'Titanic', year: 1997 },
  { name: 'Star Wars: The Force Awakens', pattern: '%Force Awakens%', year: null },
  { name: 'Avengers: Infinity War', pattern: 'Avengers: Infinity War', year: null },
  { name: 'Spider-Man: No Way Home', pattern: 'Spider-Man: No Way Home', year: null },
  { name: 'Jurassic World (2015)', pattern: 'Jurassic World', year: 2015 },
  { name: 'The Lion King (2019)', pattern: 'The Lion King', year: 2019 },
  { name: 'The Avengers (2012)', pattern: 'The Avengers', year: 2012 },
  { name: 'Furious 7', pattern: 'Furious 7', year: null },
  { name: 'Top Gun: Maverick', pattern: 'Top Gun: Maverick', year: null },
  { name: 'Frozen II', pattern: 'Frozen II', year: null },
  { name: 'Barbie (2023)', pattern: 'Barbie', year: 2023 },
  { name: 'Avengers: Age of Ultron', pattern: 'Avengers: Age of Ultron', year: null },
  { name: 'The Super Mario Bros. Movie (2023)', pattern: '%Super Mario Bros%', year: 2023 },
  { name: 'Black Panther (2018)', pattern: 'Black Panther', year: 2018 },
  { name: 'Harry Potter: Deathly Hallows Part 2', pattern: '%Deathly Hallows%Part 2%', year: null },
  { name: 'Star Wars: The Last Jedi', pattern: '%Last Jedi%', year: null },
  { name: 'Jurassic World: Fallen Kingdom', pattern: 'Jurassic World: Fallen Kingdom', year: null },
  { name: 'Frozen (2013)', pattern: 'Frozen', year: 2013 },
  { name: 'Beauty and the Beast (2017)', pattern: 'Beauty and the Beast', year: 2017 },
  { name: 'Incredibles 2', pattern: 'Incredibles 2', year: null },
  { name: 'The Fate of the Furious', pattern: 'The Fate of the Furious', year: null },
  { name: 'Iron Man 3', pattern: 'Iron Man 3', year: null },
  { name: 'Minions (2015)', pattern: 'Minions', year: 2015 },
  { name: 'Captain America: Civil War', pattern: 'Captain America: Civil War', year: null },
  { name: 'Aquaman (2018)', pattern: 'Aquaman', year: 2018 },
  { name: 'Lord of the Rings: Return of the King', pattern: '%Return of the King%', year: null },
  { name: 'Spider-Man: Far From Home', pattern: 'Spider-Man: Far From Home', year: null },
  { name: 'Captain Marvel (2019)', pattern: 'Captain Marvel', year: 2019 },
  { name: 'Skyfall', pattern: '%Skyfall%', year: null },
  { name: 'Transformers: Dark of the Moon', pattern: '%Transformers: Dark of the Moon%', year: null },
  { name: 'Joker (2019)', pattern: 'Joker', year: 2019 },
  { name: 'Star Wars: Rise of Skywalker', pattern: '%Rise of Skywalker%', year: null },
  { name: 'Toy Story 4', pattern: 'Toy Story 4', year: null },
  { name: 'Toy Story 3', pattern: 'Toy Story 3', year: null },
  { name: 'Pirates: Dead Man\'s Chest', pattern: 'Pirates of the Caribbean: Dead Man%s Chest', year: null },
  { name: 'Rogue One', pattern: '%Rogue One%', year: null },
  { name: 'Aladdin (2019)', pattern: 'Aladdin', year: 2019 },
  { name: 'Finding Dory', pattern: '%Finding Dory%', year: null },
  { name: 'Star Wars: Phantom Menace', pattern: 'Star Wars%Phantom Menace%', year: null },
  { name: 'Despicable Me 3', pattern: 'Despicable Me 3', year: null },
  { name: 'The Dark Knight Rises', pattern: 'The Dark Knight Rises', year: null },
  { name: 'The Dark Knight (2008)', pattern: 'The Dark Knight', year: 2008 },
  { name: 'Harry Potter: Deathly Hallows Part 1', pattern: '%Deathly Hallows%Part 1%', year: null },
  { name: 'Inside Out 2', pattern: 'Inside Out 2', year: null },
  { name: 'Deadpool & Wolverine', pattern: 'Deadpool & Wolverine', year: null },
];

async function checkFilms() {
  const missing = [];
  
  for (const film of filmsToCheck) {
    let query = supabase
      .from('movies')
      .select('tmdb_id, title, release_year')
      .ilike('title', film.pattern);
    
    if (film.year) {
      query = query.eq('release_year', film.year);
    }
    
    const { data, error } = await query.limit(1);
    
    if (error || !data || data.length === 0) {
      missing.push(film.name);
    }
  }
  
  console.log('\n=== MISSING FILMS FROM DATABASE ===');
  console.log(`Total missing: ${missing.length}\n`);
  missing.forEach((film, i) => {
    console.log(`${i + 1}. ${film}`);
  });
}

checkFilms().catch(console.error);
