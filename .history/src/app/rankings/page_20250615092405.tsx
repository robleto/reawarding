import { supabaseServer } from '@/lib/supabaseServer';

export default async function RankingsPage() {
  const supabase = supabaseServer();

  const { data: movies, error } = await supabase
    .from('moviesDB')
    .select('*');

  if (error) {
    console.error('Error fetching rankings:', error.message);
    return <div>Error loading rankings.</div>;
  }

  return (
    <div>
      <h1>Rankings</h1>
      {movies?.map(movie => (
        <div key={movie.id}>{movie.title}</div>
      ))}
    </div>
  );
}
