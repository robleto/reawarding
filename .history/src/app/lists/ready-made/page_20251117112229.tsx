import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { redirect } from 'next/navigation';
import { normalizeImageUrl } from '@/utils/imageUrl';
import Image from 'next/image';
import Link from 'next/link';
import { slugifyTitle } from '@/utils/slug';

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

type AlmostDirector = { director: string; seen_count: number };

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
    return { user: null, suggestions: [] as DirectorSuggestion[], almost: [] as AlmostDirector[] };
  }

  // Build sets for filtering: saved directors and dismissed suggestions
  const dismissedRaw = cookieStore.get('ready_made_dismissed')?.value;
  let dismissed: Set<string> = new Set();
  try {
    dismissed = new Set((dismissedRaw ? JSON.parse(dismissedRaw) : []) as string[]);
  } catch {}

  const { data: listsForUser } = await supabase
    .from('movie_lists')
    .select('name')
    .eq('user_id', user.id);
  const savedDirectors = new Set<string>();
  for (const row of listsForUser || []) {
    const n = (row as any).name as string;
    const dir = (n || '').split(':')[0]?.trim();
    if (dir) savedDirectors.add(dir);
  }

  // Count seen per director for this user
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
  for (const row of (counts as any[] | null) || []) {
    const mv: any = (row as any).movie;
    const dir: string | null = Array.isArray(mv) ? mv?.[0]?.director ?? null : mv?.director ?? null;
    if (!dir) continue;
    byDirector.set(dir, (byDirector.get(dir) || 0) + 1);
  }

  const candidates = [...byDirector.entries()]
    .filter(([dir, c]) => c >= 10 && !savedDirectors.has(dir) && !dismissed.has(dir))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const almost = [...byDirector.entries()]
    .filter(([dir, c]) => c >= 6 && c < 10 && !savedDirectors.has(dir) && !dismissed.has(dir))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([director, seen_count]) => ({ director, seen_count }));

  const suggestions: DirectorSuggestion[] = [];
  for (const [director, seen_count] of candidates) {
    // Fetch this user's movies for the director with ranking/seen
    const { data: items } = await supabase
      .from('rankings')
      .select('ranking, seen_it, movie:movies(id, title, poster_url, cached_poster_url, release_year, director)')
      .eq('user_id', user.id)
      .eq('seen_it', true)
      .eq('movie.director', director)
      .order('ranking', { ascending: false, nullsFirst: false });

    const movies = ((((items as any[] | null) || [])
      .map((r) => {
        const mv: any = r.movie;
        const m = Array.isArray(mv) ? mv?.[0] : mv;
        if (!m) return null;
        return {
          id: m.id as number,
          title: m.title as string,
          release_year: (m.release_year as number) ?? null,
          poster_url: (m.cached_poster_url as string | null) ?? (m.poster_url as string | null),
          ranking: (r.ranking as number | null) ?? null,
          seen_it: !!r.seen_it,
        };
      })
      .filter(Boolean)) as DirectorSuggestion['movies'])
      .sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));

    suggestions.push({ director, seen_count, movies });
  }

  return { user, suggestions, almost };
}

export const dynamic = 'force-dynamic';

export default async function ReadyMadeListsPage() {
  const { user, suggestions, almost } = await getSuggestions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-unbounded font-semibold">Ready‑Made Lists</h1>
        <p className="text-gray-400 mt-2">Auto-generated lists based on your watching habits. These are private until you choose to save them.</p>
      </div>

      {!user ? (
        <div className="bg-gray-900/60 border border-yellow-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Ready‑Made Lists</h2>
            <p className="text-gray-300">Sign in to unlock director-based ready-made lists once you have enough ranked & seen films. We’ll start generating them automatically after you mark at least 10 movies by a director as seen.</p>
            <Link href="/login" className="inline-block mt-4 px-4 py-2 bg-yellow-500 text-black rounded">Sign In</Link>
        </div>
      ) : (
        <>
          {suggestions.length === 0 && (
            <div className="bg-gray-900/60 border border-yellow-500/20 rounded-lg p-6">
              <p className="text-gray-300">No Ready‑Made lists yet. Watch and mark at least 10 movies by a director to unlock one.</p>
              <Link href="/lists" className="inline-block mt-4 text-yellow-400 underline">Go to your lists</Link>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {suggestions.map((s) => (
                <SuggestionCard key={s.director} suggestion={s} />
              ))}
            </div>
          )}

          {almost.length > 0 && (
            <div className="bg-gray-900/60 border border-yellow-500/20 rounded-lg p-5 mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Almost Ready</h2>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                  <span>Locked until 10 seen</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">You can still save a list early (kept private by default) and publish later.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {almost.map((a) => (
                  <div key={a.director} className="flex items-center justify-between bg-gray-800/50 rounded-md p-3">
                    <div className="min-w-0">
                      <Link href={`/lists/ready-made/${slugifyTitle(a.director)}`} className="block text-white font-medium hover:text-yellow-200 truncate">
                        {a.director}
                      </Link>
                      <div className="text-xs text-gray-400">{a.seen_count} of 10 seen • {Math.max(0, 10 - a.seen_count)} away</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <div className="h-2 bg-gray-700 rounded">
                          <div className="h-2 bg-yellow-500 rounded" style={{ width: `${Math.min(100, (a.seen_count/10)*100)}%` }} />
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                          Locked
                        </span>
                        <Link href={`/lists/ready-made/${slugifyTitle(a.director)}`} className="text-xs text-yellow-300 hover:underline whitespace-nowrap">View</Link>
                      </div>
                      <form action={saveList} className="ml-1">
                        <input type="hidden" name="director" value={a.director} />
                        <input type="hidden" name="count" value={a.seen_count} />
                        {/* no movie_ids -> server derives current seen ids */}
                        <button type="submit" className="text-xs px-2.5 py-1.5 rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 whitespace-nowrap">Save anyway</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatListName(director: string, count: number) {
  return `${director}: ${count} You’ve Seen`;
}

async function saveList(formData: FormData) {
  'use server';
  const director = String(formData.get('director') || '');
  const count = Number(formData.get('count') || 0);
  let ids = String(formData.get('movie_ids') || '')
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
    redirect('/login');
  }

  // Fallback: if no ids were posted, rebuild from server-side query
  if (ids.length === 0 && director) {
    // 1) Get all movie ids by this director
    const { data: movieRows } = await supabase
      .from('movies')
      .select('id')
      .eq('director', director);
    const movieIds = (movieRows || []).map((m) => m.id as number);
    if (movieIds.length) {
      // 2) Intersect with user's seen rankings and sort by user's ranking desc
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', movieIds);
      ids = Array.from(
        new Set(
          (rankRows || [])
            .sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0)))
            .map((r) => r.movie_id as number)
        )
      );
    }
  }

  const name = formatListName(director, count);
  // Find existing list by name for this user to avoid duplicates
  const { data: existingList, error: existingListErr } = await supabase
    .from('movie_lists')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name)
    .maybeSingle();

  let listId: string | null = existingList?.id ?? null;
  if (!listId) {
    const { data: listRows, error: listErr } = await supabase
      .from('movie_lists')
      .insert({ user_id: user.id, name, description: `Auto-generated list of films by ${director}`, is_public: false })
      .select('id')
      .limit(1);
    if (listErr || !listRows?.[0]) {
      redirect('/lists');
    }
    listId = listRows[0].id as string;
  }

  // Insert only movies not already in the list
  const { data: existingItems } = await supabase
    .from('movie_list_items')
    .select('movie_id')
    .eq('list_id', listId);
  const existingIds = new Set((existingItems || []).map((r) => r.movie_id));
  const newIds = ids.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    // Determine next ranking position (keep highest rank for top of list)
    const nextStart = (existingItems?.length || 0) + newIds.length;
    const items = newIds.map((movie_id, idx) => ({ list_id: listId!, movie_id, ranking: nextStart - idx }));
    const { error: itemsErr } = await supabase.from('movie_list_items').insert(items);
    if (itemsErr) {
      redirect('/lists');
    }
  }
  // Touch updated_at so it floats to top and shows fresh timestamp
  await supabase
    .from('movie_lists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', listId);
  redirect('/lists');
}

async function dismissSuggestion(formData: FormData) {
  'use server';
  const director = String(formData.get('director') || '').trim();
  if (!director) {
    redirect('/lists/ready-made');
  }
  const cookieStore = await cookies();
  const key = 'ready_made_dismissed';
  let current: string[] = [];
  try {
    const raw = cookieStore.get(key)?.value;
    current = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {}
  if (!current.includes(director)) current.push(director);
  // Set cookie (client-readable, path-wide) so SSR can filter next render
  cookieStore.set({ name: key, value: JSON.stringify(current), httpOnly: false, sameSite: 'lax', path: '/' });
  redirect('/lists/ready-made');
}

function SuggestionCard({ suggestion }: { suggestion: DirectorSuggestion }) {
  const name = formatListName(suggestion.director, suggestion.seen_count);
  const ids = suggestion.movies.map((m) => m.id).join(',');
  const posterUrls = suggestion.movies
    .map((m) => m.poster_url)
    .filter((u): u is string => !!u)
    .slice(0, 5);
  const href = `/lists/ready-made/${slugifyTitle(suggestion.director)}`;
  return (
    <div className="bg-gray-900/60 border border-yellow-500/20 rounded-lg p-5 overflow-visible">
      {/* Fan of posters to match ListCard */}
      {posterUrls.length > 0 && (
        <div className="flex items-center justify-center -mt-4 mb-2 h-28 relative overflow-visible z-20">
          {posterUrls.map((url: string, i: number) => (
            <div
              key={i}
              className="absolute w-16 h-24 rounded-xl shadow-lg border-2 border-gray-800 overflow-hidden"
              style={{
                left: `calc(50% + ${(i - (posterUrls.length - 1) / 2) * 32}px - 32px)`,
                zIndex: posterUrls.length - i,
                transform: `rotate(${(i - 2) * 7}deg)`
              }}
            >
              {(() => {
                const src = normalizeImageUrl(url);
                return src ? (
                  <Image src={src} alt="Movie poster" fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full bg-gray-700" />
                );
              })()}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <Link href={href} className="block flex-1 pr-4">
          <h2 className="text-xl font-semibold hover:text-yellow-200 transition-colors">{name}</h2>
          <p className="text-sm text-gray-400">Auto-generated from your seen films • Director: {suggestion.director}</p>
        </Link>
        <div className="flex items-center gap-2">
          <form action={dismissSuggestion}>
            <input type="hidden" name="director" value={suggestion.director} />
            <button className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600" type="submit">Dismiss</button>
          </form>
          <form action={saveList}>
            <input type="hidden" name="director" value={suggestion.director} />
            <input type="hidden" name="count" value={suggestion.seen_count} />
            <input type="hidden" name="movie_ids" value={ids} />
            <button className="px-3 py-1.5 text-sm bg-yellow-500 text-black rounded hover:bg-yellow-400" type="submit">Save</button>
          </form>
        </div>
      </div>
      <div className="mt-3">
        <Link href={href} className="text-sm text-yellow-300 hover:underline">View full list →</Link>
      </div>
    </div>
  );
}

