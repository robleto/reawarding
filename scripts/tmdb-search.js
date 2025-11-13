const apiKey = process.env.TMDB_API_KEY || 'e93df744a2e8410c98f2c7ec17b7c8c9';
async function fetchJson(url){ const r = await fetch(url); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
async function search(query){ const url = new URL('https://api.themoviedb.org/3/search/movie'); url.searchParams.set('api_key', apiKey); url.searchParams.set('query', query); const data = await fetchJson(url.toString()); return (data.results||[]).map(m=>({id:m.id,title:m.title,release_date:m.release_date})); }
(async()=>{
  console.log('\nDie My Love search results:');
  console.log(await search('Die My Love'));
  console.log('\nFrankenstein search results:');
  console.log((await search('Frankenstein')).slice(0,10));
})();