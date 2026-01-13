/**
 * Check which IMDb Top 250 films are missing from the database
 * Usage: node scripts/find-missing-imdb-250.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// All 250 IMDb Top 250 films with title and year for disambiguation
const imdbTop250 = [
  { title: 'The Shawshank Redemption', year: 1994 },
  { title: 'The Godfather', year: 1972 },
  { title: 'The Dark Knight', year: 2008 },
  { title: 'The Godfather Part II', year: 1974 },
  { title: '12 Angry Men', year: 1957 },
  { title: "Schindler's List", year: 1993 },
  { title: 'The Lord of the Rings: The Return of the King', year: 2003 },
  { title: 'Pulp Fiction', year: 1994 },
  { title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001 },
  { title: 'The Good, the Bad and the Ugly', year: 1966 },
  { title: 'Forrest Gump', year: 1994 },
  { title: 'Fight Club', year: 1999 },
  { title: 'The Lord of the Rings: The Two Towers', year: 2002 },
  { title: 'Inception', year: 2010 },
  { title: 'Star Wars: Episode V - The Empire Strikes Back', year: 1980 },
  { title: 'The Matrix', year: 1999 },
  { title: 'Goodfellas', year: 1990 },
  { title: "One Flew Over the Cuckoo's Nest", year: 1975 },
  { title: 'Se7en', year: 1995 },
  { title: 'Seven Samurai', year: 1954 },
  { title: "It's a Wonderful Life", year: 1946 },
  { title: 'The Silence of the Lambs', year: 1991 },
  { title: 'Saving Private Ryan', year: 1998 },
  { title: 'Interstellar', year: 2014 },
  { title: 'City of God', year: 2002 },
  { title: 'Life Is Beautiful', year: 1997 },
  { title: 'The Green Mile', year: 1999 },
  { title: 'Star Wars: Episode IV - A New Hope', year: 1977 },
  { title: 'Terminator 2: Judgment Day', year: 1991 },
  { title: 'Back to the Future', year: 1985 },
  { title: 'Spirited Away', year: 2001 },
  { title: 'Psycho', year: 1960 },
  { title: 'The Pianist', year: 2002 },
  { title: 'Parasite', year: 2019 },
  { title: 'Léon: The Professional', year: 1994 },
  { title: 'Gladiator', year: 2000 },
  { title: 'The Lion King', year: 1994 },
  { title: 'American History X', year: 1998 },
  { title: 'The Departed', year: 2006 },
  { title: 'Whiplash', year: 2014 },
  { title: 'The Prestige', year: 2006 },
  { title: 'The Usual Suspects', year: 1995 },
  { title: 'Casablanca', year: 1942 },
  { title: 'Harakiri', year: 1962 },
  { title: 'The Intouchables', year: 2011 },
  { title: 'Modern Times', year: 1936 },
  { title: 'Grave of the Fireflies', year: 1988 },
  { title: 'Once Upon a Time in the West', year: 1968 },
  { title: 'Rear Window', year: 1954 },
  { title: 'Alien', year: 1979 },
  { title: 'City Lights', year: 1931 },
  { title: 'Apocalypse Now', year: 1979 },
  { title: 'Memento', year: 2000 },
  { title: 'Django Unchained', year: 2012 },
  { title: 'WALL·E', year: 2008 },
  { title: 'The Lives of Others', year: 2006 },
  { title: 'Sunset Boulevard', year: 1950 },
  { title: 'Paths of Glory', year: 1957 },
  { title: 'The Great Dictator', year: 1940 },
  { title: 'Avengers: Infinity War', year: 2018 },
  { title: 'Witness for the Prosecution', year: 1957 },
  { title: 'Spider-Man: Into the Spider-Verse', year: 2018 },
  { title: 'The Shining', year: 1980 },
  { title: 'Inglourious Basterds', year: 2009 },
  { title: 'Dr. Strangelove', year: 1964 },
  { title: 'Oldboy', year: 2003 },
  { title: 'Aliens', year: 1986 },
  { title: 'Amélie', year: 2001 },
  { title: 'Coco', year: 2017 },
  { title: 'Toy Story', year: 1995 },
  { title: 'Braveheart', year: 1995 },
  { title: 'Amadeus', year: 1984 },
  { title: 'Das Boot', year: 1981 },
  { title: 'Princess Mononoke', year: 1997 },
  { title: 'Joker', year: 2019 },
  { title: 'Avengers: Endgame', year: 2019 },
  { title: 'Your Name', year: 2016 },
  { title: 'Good Will Hunting', year: 1997 },
  { title: 'Toy Story 3', year: 2010 },
  { title: '3 Idiots', year: 2009 },
  { title: 'Once Upon a Time in America', year: 1984 },
  { title: 'Singin\' in the Rain', year: 1952 },
  { title: 'Requiem for a Dream', year: 2000 },
  { title: 'Star Wars: Episode VI - Return of the Jedi', year: 1983 },
  { title: '2001: A Space Odyssey', year: 1968 },
  { title: 'Capernaum', year: 2018 },
  { title: 'High and Low', year: 1963 },
  { title: 'Come and See', year: 1985 },
  { title: 'Eternal Sunshine of the Spotless Mind', year: 2004 },
  { title: 'Reservoir Dogs', year: 1992 },
  { title: 'Citizen Kane', year: 1941 },
  { title: 'The Hunt', year: 2012 },
  { title: 'M', year: 1931 },
  { title: 'Lawrence of Arabia', year: 1962 },
  { title: 'Vertigo', year: 1958 },
  { title: 'North by Northwest', year: 1959 },
  { title: 'A Clockwork Orange', year: 1971 },
  { title: 'Full Metal Jacket', year: 1987 },
  { title: 'Amélie', year: 2001 },
  { title: 'To Kill a Mockingbird', year: 1962 },
  { title: 'Incendies', year: 2010 },
  { title: 'Hamilton', year: 2020 },
  { title: 'Heat', year: 1995 },
  { title: 'Scarface', year: 1983 },
  { title: 'The Sting', year: 1973 },
  { title: 'The Apartment', year: 1960 },
  { title: 'Indiana Jones and the Last Crusade', year: 1989 },
  { title: 'Metropolis', year: 1927 },
  { title: 'Up', year: 2009 },
  { title: 'L.A. Confidential', year: 1997 },
  { title: 'To Be or Not to Be', year: 1942 },
  { title: 'Snatch', year: 2000 },
  { title: 'Die Hard', year: 1988 },
  { title: 'Ikiru', year: 1952 },
  { title: 'Batman Begins', year: 2005 },
  { title: 'Some Like It Hot', year: 1959 },
  { title: 'The Kid', year: 1921 },
  { title: 'The Father', year: 2020 },
  { title: 'For a Few Dollars More', year: 1965 },
  { title: 'All About Eve', year: 1950 },
  { title: 'The Wolf of Wall Street', year: 2013 },
  { title: 'Green Book', year: 2018 },
  { title: 'Judgment at Nuremberg', year: 1961 },
  { title: 'There Will Be Blood', year: 2007 },
  { title: 'Casino', year: 1995 },
  { title: 'Pan\'s Labyrinth', year: 2006 },
  { title: 'The Truman Show', year: 1998 },
  { title: 'Shutter Island', year: 2010 },
  { title: 'Ran', year: 1985 },
  { title: 'Unforgiven', year: 1992 },
  { title: 'Monty Python and the Holy Grail', year: 1975 },
  { title: 'Downfall', year: 2004 },
  { title: 'Raging Bull', year: 1980 },
  { title: 'The Great Escape', year: 1963 },
  { title: 'Howl\'s Moving Castle', year: 2004 },
  { title: 'Kill Bill: Vol. 1', year: 2003 },
  { title: 'Rashomon', year: 1950 },
  { title: 'A Beautiful Mind', year: 2001 },
  { title: 'The Third Man', year: 1949 },
  { title: 'On the Waterfront', year: 1954 },
  { title: 'The Gold Rush', year: 1925 },
  { title: 'Finding Nemo', year: 2003 },
  { title: 'Chinatown', year: 1974 },
  { title: 'The Secret in Their Eyes', year: 2009 },
  { title: 'Bicycle Thieves', year: 1948 },
  { title: 'V for Vendetta', year: 2005 },
  { title: 'Inside Out', year: 2015 },
  { title: 'No Country for Old Men', year: 2007 },
  { title: 'Blade Runner', year: 1982 },
  { title: 'Lock, Stock and Two Smoking Barrels', year: 1998 },
  { title: 'The Bridge on the River Kwai', year: 1957 },
  { title: 'Fargo', year: 1996 },
  { title: 'Room', year: 2015 },
  { title: 'The Seventh Seal', year: 1957 },
  { title: 'Trainspotting', year: 1996 },
  { title: 'Tokyo Story', year: 1953 },
  { title: 'Gone with the Wind', year: 1939 },
  { title: 'The Elephant Man', year: 1980 },
  { title: 'The Sixth Sense', year: 1999 },
  { title: 'Wild Strawberries', year: 1957 },
  { title: 'The General', year: 1926 },
  { title: 'Gran Torino', year: 2008 },
  { title: 'Dial M for Murder', year: 1954 },
  { title: 'Klaus', year: 2019 },
  { title: 'Warrior', year: 2011 },
  { title: 'The Deer Hunter', year: 1978 },
  { title: 'Prisoners', year: 2013 },
  { title: 'The Big Lebowski', year: 1998 },
  { title: 'Wild Tales', year: 2014 },
  { title: 'Catch Me If You Can', year: 2002 },
  { title: 'Mr. Smith Goes to Washington', year: 1939 },
  { title: 'Children of Heaven', year: 1997 },
  { title: 'Gone Girl', year: 2014 },
  { title: 'The Grand Budapest Hotel', year: 2014 },
  { title: 'Memories of Murder', year: 2003 },
  { title: 'Sherlock Jr.', year: 1924 },
  { title: 'The Treasure of the Sierra Madre', year: 1948 },
  { title: 'Before Sunrise', year: 1995 },
  { title: 'Hacksaw Ridge', year: 2016 },
  { title: 'How to Train Your Dragon', year: 2010 },
  { title: 'Jurassic Park', year: 1993 },
  { title: 'Mary and Max', year: 2009 },
  { title: 'Yojimbo', year: 1961 },
  { title: 'The Best Years of Our Lives', year: 1946 },
  { title: 'The Handmaiden', year: 2016 },
  { title: 'Barry Lyndon', year: 1975 },
  { title: 'In the Name of the Father', year: 1993 },
  { title: 'Spotlight', year: 2015 },
  { title: 'Rebecca', year: 1940 },
  { title: '12 Years a Slave', year: 2013 },
  { title: 'The Wages of Fear', year: 1953 },
  { title: 'Stalker', year: 1979 },
  { title: 'Amores Perros', year: 2000 },
  { title: 'My Neighbor Totoro', year: 1988 },
  { title: 'Monsters, Inc.', year: 2001 },
  { title: 'The Battle of Algiers', year: 1966 },
  { title: 'The 400 Blows', year: 1959 },
  { title: 'It Happened One Night', year: 1934 },
  { title: 'Nightcrawler', year: 2014 },
  { title: 'The Passion of Joan of Arc', year: 1928 },
  { title: 'Jai Bhim', year: 2021 },
  { title: 'Hotel Rwanda', year: 2004 },
  { title: 'Persona', year: 1966 },
  { title: 'Rush', year: 2013 },
  { title: 'Logan', year: 2017 },
  { title: 'Dune', year: 2021 },
  { title: 'Platoon', year: 1986 },
  { title: 'The Terminator', year: 1984 },
  { title: 'The Grapes of Wrath', year: 1940 },
  { title: 'Guardians of the Galaxy', year: 2014 },
  { title: 'Everything Everywhere All at Once', year: 2022 },
  { title: 'Ford v Ferrari', year: 2019 },
  { title: 'The Wizard of Oz', year: 1939 },
  { title: 'The Exorcist', year: 1973 },
  { title: 'Pather Panchali', year: 1955 },
  { title: 'The Night of the Hunter', year: 1955 },
  { title: 'The Thing', year: 1982 },
  { title: 'Stand by Me', year: 1986 },
  { title: 'Nausicaä of the Valley of the Wind', year: 1984 },
  { title: 'The Red Shoes', year: 1948 },
  { title: 'Ratatouille', year: 2007 },
  { title: 'The Incredibles', year: 2004 },
  { title: 'The Maltese Falcon', year: 1941 },
  { title: 'Cool Hand Luke', year: 1967 },
  { title: 'Network', year: 1976 },
  { title: 'The Help', year: 2011 },
  { title: 'Hachi: A Dog\'s Tale', year: 2009 },
  { title: 'Paris, Texas', year: 1984 },
  { title: 'Pirates of the Caribbean: The Curse of the Black Pearl', year: 2003 },
  { title: 'The Iron Giant', year: 1999 },
  { title: 'Dead Poets Society', year: 1989 },
  { title: 'Brief Encounter', year: 1945 },
  { title: 'Cinema Paradiso', year: 1988 },
  { title: 'Andrei Rublev', year: 1966 },
  { title: 'The Princess Bride', year: 1987 },
  { title: 'Rope', year: 1948 },
];

// Alternative titles for films commonly named differently
const alternativeTitles = {
  'Star Wars: Episode V - The Empire Strikes Back': ['The Empire Strikes Back', 'Empire Strikes Back'],
  'Star Wars: Episode IV - A New Hope': ['Star Wars', 'A New Hope'],
  'Star Wars: Episode VI - Return of the Jedi': ['Return of the Jedi'],
  'Léon: The Professional': ['Leon: The Professional', 'The Professional', 'Leon'],
  'Dr. Strangelove': ['Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb'],
};

async function findMissingFilms() {
  console.log('Checking which IMDb Top 250 films are in the database...\n');
  
  const missing = [];
  const found = [];

  for (const film of imdbTop250) {
    let searchTitles = [film.title];
    if (alternativeTitles[film.title]) {
      searchTitles = [...searchTitles, ...alternativeTitles[film.title]];
    }

    let filmFound = false;
    
    for (const title of searchTitles) {
      const { data, error } = await supabase
        .from('movies')
        .select('tmdb_id, title, release_year')
        .ilike('title', `%${title}%`)
        .eq('release_year', film.year)
        .limit(1)
        .single();

      if (!error && data) {
        found.push({ ...film, db_year: data.release_year, db_title: data.title });
        filmFound = true;
        break;
      }
    }

    if (!filmFound) {
      // Try without year as last resort
      for (const title of searchTitles) {
        const { data: data2, error: error2 } = await supabase
          .from('movies')
          .select('tmdb_id, title, release_year')
          .ilike('title', `%${title}%`)
          .limit(1)
          .single();

        if (!error2 && data2) {
          found.push({ ...film, db_year: data2.release_year, db_title: data2.title });
          filmFound = true;
          break;
        }
      }
    }

    if (!filmFound) {
      missing.push(film);
    }
  }

  console.log(`✅ Found: ${found.length} films`);
  console.log(`❌ Missing: ${missing.length} films\n`);

  if (missing.length > 0) {
    console.log('Missing films:');
    console.log('='.repeat(60));
    missing.forEach((film, index) => {
      console.log(`${index + 1}. ${film.title} (${film.year})`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total missing: ${missing.length} out of 250`);
}

findMissingFilms().catch(console.error);
