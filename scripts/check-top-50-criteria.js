const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCriteria() {
  console.log('Checking different ranking criteria for films since 2020...\n');

  // Check TMDB popularity
  const { data: byPopularity } = await supabase
    .from('movies')
    .select('title, popularity, tmdb_rating, vote_count, release_date')
    .gte('release_date', '2020-01-01')
    .order('popularity', { ascending: false, nullsFirst: false })
    .limit(10);

  console.log('=== TOP 10 BY TMDB POPULARITY ===');
  byPopularity?.forEach((m, i) => {
    console.log(`${i+1}. ${m.title} (${m.release_date?.substring(0,4)}) - Pop: ${m.popularity?.toFixed(1)}, Rating: ${m.tmdb_rating}, Votes: ${m.vote_count?.toLocaleString()}`);
  });

  // Check vote count (popularity measure)
  const { data: byVotes } = await supabase
    .from('movies')
    .select('title, vote_count, tmdb_rating, popularity, release_date')
    .gte('release_date', '2020-01-01')
    .order('vote_count', { ascending: false, nullsFirst: false })
    .limit(10);

  console.log('\n=== TOP 10 BY VOTE COUNT ===');
  byVotes?.forEach((m, i) => {
    console.log(`${i+1}. ${m.title} (${m.release_date?.substring(0,4)}) - Votes: ${m.vote_count?.toLocaleString()}, Rating: ${m.tmdb_rating}, Pop: ${m.popularity?.toFixed(1)}`);
  });

  // Check combined score (rating * log(votes))
  const { data: allMovies } = await supabase
    .from('movies')
    .select('title, vote_count, tmdb_rating, popularity, release_date')
    .gte('release_date', '2020-01-01')
    .not('vote_count', 'is', null)
    .not('tmdb_rating', 'is', null)
    .gte('vote_count', 100);

  const scored = allMovies?.map(m => ({
    ...m,
    score: m.tmdb_rating * Math.log10(m.vote_count)
  })).sort((a, b) => b.score - a.score).slice(0, 10);

  console.log('\n=== TOP 10 BY COMBINED SCORE (rating * log(votes)) ===');
  scored?.forEach((m, i) => {
    console.log(`${i+1}. ${m.title} (${m.release_date?.substring(0,4)}) - Score: ${m.score.toFixed(2)}, Rating: ${m.tmdb_rating}, Votes: ${m.vote_count?.toLocaleString()}`);
  });
}

checkCriteria();
