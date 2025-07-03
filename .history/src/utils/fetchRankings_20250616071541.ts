// src/utils/fetchRankings.ts
// src/utils/fetchRankings.ts
import { supabaseServer } from './supabaseServer';

export async function fetchRankings() {
  const supabase = supabaseServer(); // initialize the server-side client

  const { data, error } = await supabase.from('moviesDB').select('*');

  if (error) throw new Error(error.message);
  return data;
}
