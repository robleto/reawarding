import { supabaseServer } from '@/lib/supabaseServer';

type Movie = {
  id: number;
  title: string;
  // Add other fields as needed
};

export default async function RankingsPage() {
  const supabase = supabaseServer();

  const { data: movies, error } = await supabase
    .from('moviesDB')
    .select('*');

  if (error) {
    console.error('Error fetching rankings:', error.message);
      {movies?.map((movie: Movie) => (
        <div key={movie.id}>{movie.title}</div>
      ))}
  return (
    <div>
      <h1>Rankings</h1>
      {movies?.map(movie => (
        <div key={movie.id}>{movie.title}</div>
      ))}
    </div>
  );
}
