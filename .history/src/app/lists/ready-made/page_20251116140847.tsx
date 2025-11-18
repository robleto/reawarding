import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import { normalizeImageUrl } from '@/utils/imageUrl';

type DirectorSuggestion = {
  director: string;
  seen_count: number;
  movies: Array<{
    id: number;
    title: string;
    release_year: number | null;
    poster_url: string | null;
    ranking: number | null;
    seen_it: boolean;
  }>;
};

async function getSuggestions() {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, suggestions: [] as DirectorSuggestion[] };
  }

  // Count seen per director for this user
  type CountRow = { seen_it: boolean; movie: { director: string | null } | null };
  const { data: counts, error: countErr } = await supabase
    .from('rankings')
    .select('seen_it, movie:movies(director)')
    .eq('user_id', user.id)
    .eq('seen_it', true);

  if (countErr) {
    console.warn('ready-made counts error', countErr);
    return { user, suggestions: [] as DirectorSuggestion[] };
  }

  const byDirector = new Map<string, number>();
  for (const row of (counts as CountRow[] | null) || []) {
    const dir = row.movie?.director ?? null;
    if (!dir) continue;
    byDirector.set(dir, (byDirector.get(dir) || 0) + 1);
  }

  const candidates = [...byDirector.entries()]
    .filter(([, c]) => c >= 10)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const suggestions: DirectorSuggestion[] = [];
  for (const [director, seen_count] of candidates) {
    // Fetch this user's movies for the director with ranking/seen
    type ItemRow = {
      ranking: number | null;
      seen_it: boolean;
      movie: {
        id: number;
        title: string;
        poster_url: string | null;
        cached_poster_url: string | null;
        release_year: number | null;
        director: string | null;
      } | null;
    };
    const { data: items } = await supabase
      .from('rankings')
      .select('ranking, seen_it, movie:movies(id, title, poster_url, cached_poster_url, release_year, director)')
      .eq('user_id', user.id)
      .eq('seen_it', true)
      .eq('movie.director', director)
      .order('ranking', { ascending: false, nullsFirst: false });

    const movies = ((items as ItemRow[] | null) || [])
      .filter((r) => !!r.movie)
      .map((r) => ({
        id: r.movie!.id,
        title: r.movie!.title,
        release_year: r.movie!.release_year,
        poster_url: r.movie!.cached_poster_url ?? r.movie!.poster_url,
        ranking: r.ranking ?? null,
        seen_it: !!r.seen_it,
      }))
      .sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));

    suggestions.push({ director, seen_count, movies });
  }

  return { user, suggestions };
}

export const dynamic = 'force-dynamic';

export default async function ReadyMadeListsPage() {
  const { user, suggestions } = await getSuggestions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-unbounded font-semibold">Ready‑Made Lists</h1>
        <p className="text-gray-400 mt-2">Auto-generated lists based on your watching habits. These are private until you choose to save them.</p>
      </div>

      {!user ? (
        <div className="bg-gray-900/60 border border-yellow-500/20 rounded-lg p-6">
          <p className="text-gray-300">Sign in to see your ready-made lists. We’ll create suggestions once you mark movies as seen.</p>
          <Link href="/login" className="inline-block mt-4 px-4 py-2 bg-yellow-500 text-black rounded">Sign in</Link>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-gray-900/60 border border-yellow-500/20 rounded-lg p-6">
          <p className="text-gray-300">No suggestions yet. Watch and mark at least 10 movies by a director to unlock a ready-made list.</p>
          <Link href="/lists" className="inline-block mt-4 text-yellow-400 underline">Go to your lists</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suggestions.map((s) => (
            <SuggestionCard key={s.director} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function formatListName(director: string, count: number) {
  return `${director}: ${count} You’ve Seen`;
}

async function createListAction(prevState: any, formData: FormData) {
  'use server';
  const director = String(formData.get('director') || '');
  const count = Number(formData.get('count') || 0);
  const ids = String(formData.get('movie_ids') || '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'not-authenticated' };
  }

  const name = formatListName(director, count);
  const { data: listRows, error: listErr } = await supabase
    .from('movie_lists')
    .insert({ user_id: user.id, name, description: `Auto-generated list of films by ${director}`, is_public: false })
    .select('id')
    .limit(1);
  if (listErr || !listRows?.[0]) {
    return { ok: false, error: listErr?.message || 'create-list-failed' };
  }
  const listId = listRows[0].id as string;

  const items = ids.map((movie_id, idx) => ({ list_id: listId, movie_id, ranking: ids.length - idx }));
  const { error: itemsErr } = await supabase.from('movie_list_items').insert(items);
  if (itemsErr) {
    return { ok: false, error: itemsErr.message };
  }
  return { ok: true, listId };
}

function SuggestionCard({ suggestion }: { suggestion: DirectorSuggestion }) {
  const name = formatListName(suggestion.director, suggestion.seen_count);
  const ids = suggestion.movies.map((m) => m.id).join(',');
  return (
    <div className="bg-gray-900/60 border border-yellow-500/20 rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{name}</h2>
          <p className="text-sm text-gray-400">Auto-generated from your seen films • Director: {suggestion.director}</p>
        </div>
        <form action={createListAction}>
          <input type="hidden" name="director" value={suggestion.director} />
          <input type="hidden" name="count" value={suggestion.seen_count} />
          <input type="hidden" name="movie_ids" value={ids} />
          <button className="px-3 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-400" type="submit">Save as List</button>
        </form>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {suggestion.movies.slice(0, 12).map((m) => (
          <div key={m.id} className="w-28 shrink-0">
            <div className="aspect-[2/3] rounded bg-gray-800 overflow-hidden border border-gray-800">
              {m.poster_url ? (
                <img src={normalizeImageUrl(m.poster_url)} alt={m.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Image</div>
              )}
            </div>
            <div className="mt-1 text-xs line-clamp-2">{m.title}</div>
            <div className="text-[10px] text-gray-500">{m.release_year ?? ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
