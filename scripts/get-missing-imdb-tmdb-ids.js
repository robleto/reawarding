/**
 * Fetch TMDB IDs for missing IMDb Top 250 films
 * Usage: node scripts/get-missing-imdb-tmdb-ids.js
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;

const missingFilms = [
  { title: 'Star Wars: Episode V - The Empire Strikes Back', year: 1980 },
  { title: 'City of God', year: 2002 },
  { title: 'Star Wars: Episode IV - A New Hope', year: 1977 },
  { title: 'The Pianist', year: 2002 },
  { title: 'Léon: The Professional', year: 1994 },
  { title: 'American History X', year: 1998 },
  { title: 'Whiplash', year: 2014 },
  { title: 'Harakiri', year: 1962 },
  { title: 'The Intouchables', year: 2011 },
  { title: 'Once Upon a Time in the West', year: 1968 },
  { title: 'The Lives of Others', year: 2006 },
  { title: 'Paths of Glory', year: 1957 },
  { title: 'The Great Dictator', year: 1940 },
  { title: 'Witness for the Prosecution', year: 1957 },
  { title: 'Dr. Strangelove', year: 1964 },
  { title: 'Oldboy', year: 2003 },
  { title: 'Das Boot', year: 1981 },
  { title: 'Your Name', year: 2016 },
  { title: '3 Idiots', year: 2009 },
  { title: 'Once Upon a Time in America', year: 1984 },
  { title: 'Requiem for a Dream', year: 2000 },
  { title: 'Star Wars: Episode VI - Return of the Jedi', year: 1983 },
  { title: 'Capernaum', year: 2018 },
  { title: 'High and Low', year: 1963 },
  { title: 'Come and See', year: 1985 },
  { title: 'The Hunt', year: 2012 },
  { title: 'M', year: 1931 },
  { title: 'Incendies', year: 2010 },
  { title: 'Scarface', year: 1983 },
  { title: 'Metropolis', year: 1927 },
  { title: 'To Be or Not to Be', year: 1942 },
  { title: 'Ikiru', year: 1952 },
  { title: 'The Kid', year: 1921 },
  { title: 'The Father', year: 2020 },
  { title: 'For a Few Dollars More', year: 1965 },
  { title: 'Judgment at Nuremberg', year: 1961 },
  { title: 'Pan\'s Labyrinth', year: 2006 },
  { title: 'Ran', year: 1985 },
  { title: 'Monty Python and the Holy Grail', year: 1975 },
  { title: 'Downfall', year: 2004 },
  { title: 'The Great Escape', year: 1963 },
  { title: 'Rashomon', year: 1950 },
  { title: 'The Third Man', year: 1949 },
  { title: 'The Secret in Their Eyes', year: 2009 },
  { title: 'Bicycle Thieves', year: 1948 },
  { title: 'Room', year: 2015 },
  { title: 'The Seventh Seal', year: 1957 },
  { title: 'Trainspotting', year: 1996 },
  { title: 'Tokyo Story', year: 1953 },
  { title: 'The Elephant Man', year: 1980 },
  { title: 'Wild Strawberries', year: 1957 },
  { title: 'Dial M for Murder', year: 1954 },
  { title: 'Warrior', year: 2011 },
  { title: 'Prisoners', year: 2013 },
  { title: 'The Big Lebowski', year: 1998 },
  { title: 'Wild Tales', year: 2014 },
  { title: 'Children of Heaven', year: 1997 },
  { title: 'Memories of Murder', year: 2003 },
  { title: 'Sherlock Jr.', year: 1924 },
  { title: 'Mary and Max', year: 2009 },
  { title: 'Yojimbo', year: 1961 },
  { title: 'The Handmaiden', year: 2016 },
  { title: 'In the Name of the Father', year: 1993 },
  { title: 'Spotlight', year: 2015 },
  { title: 'Rebecca', year: 1940 },
  { title: 'The Wages of Fear', year: 1953 },
  { title: 'Stalker', year: 1979 },
  { title: 'Amores Perros', year: 2000 },
  { title: 'The Battle of Algiers', year: 1966 },
  { title: 'The 400 Blows', year: 1959 },
  { title: 'Nightcrawler', year: 2014 },
  { title: 'The Passion of Joan of Arc', year: 1928 },
  { title: 'Jai Bhim', year: 2021 },
  { title: 'Hotel Rwanda', year: 2004 },
  { title: 'Persona', year: 1966 },
  { title: 'Rush', year: 2013 },
  { title: 'The Terminator', year: 1984 },
  { title: 'Ford v Ferrari', year: 2019 },
  { title: 'Pather Panchali', year: 1955 },
  { title: 'The Night of the Hunter', year: 1955 },
  { title: 'The Thing', year: 1982 },
  { title: 'The Red Shoes', year: 1948 },
  { title: 'Cool Hand Luke', year: 1967 },
  { title: 'Hachi: A Dog\'s Tale', year: 2009 },
  { title: 'Paris, Texas', year: 1984 },
  { title: 'Brief Encounter', year: 1945 },
  { title: 'Cinema Paradiso', year: 1988 },
  { title: 'Andrei Rublev', year: 1966 },
  { title: 'Rope', year: 1948 },
];

async function fetchTMDBId(title, year) {
  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
  
  try {
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].id;
    }
    
    // Try without year if no exact match
    const searchUrl2 = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    const response2 = await fetch(searchUrl2);
    const data2 = await response2.json();
    
    if (data2.results && data2.results.length > 0) {
      return data2.results[0].id;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching ${title}:`, error.message);
    return null;
  }
}

async function getAllTMDBIds() {
  console.log('Fetching TMDB IDs for 89 missing IMDb Top 250 films...\n');
  console.log('TMDB ID | Year | Title');
  console.log('--------|------|------');
  
  const results = [];
  
  for (let i = 0; i < missingFilms.length; i++) {
    const film = missingFilms[i];
    const tmdbId = await fetchTMDBId(film.title, film.year);
    
    if (tmdbId) {
      console.log(`${tmdbId} | ${film.year} | ${film.title}`);
      results.push({ ...film, tmdbId });
    } else {
      console.log(`❌ NOT FOUND | ${film.year} | ${film.title}`);
      results.push({ ...film, tmdbId: null });
    }
    
    // Rate limiting - wait 250ms between requests
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Found TMDB IDs for ${results.filter(r => r.tmdbId).length} out of ${missingFilms.length} films`);
  console.log('\nCopy the IDs above to add films manually via the admin interface.');
}

getAllTMDBIds().catch(console.error);
