import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { redirect } from 'next/navigation';
import { normalizeImageUrl } from '@/utils/imageUrl';
import Image from 'next/image';
import Link from 'next/link';
import { slugifyTitle } from '@/utils/slug';
import ReadyMadeTabs from '@/components/lists/ReadyMadeTabs';
import ReadyMadeCard from '@/components/lists/ReadyMadeCard';

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
type ActorSuggestion = {
  actor: string;
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
type GenreSuggestion = {
  genre: string;
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
type DecadeSuggestion = {
  decade: string; // e.g. "1990s"
  startYear: number; // decade start for fallback queries
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
type AlmostActor = { actor: string; seen_count: number };
type AlmostGenre = { genre: string; seen_count: number };
type AlmostDecade = { decade: string; startYear: number; seen_count: number };

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
    return {
      user: null,
      suggestions: [] as DirectorSuggestion[],
      almost: [] as AlmostDirector[],
      actorSuggestions: [] as ActorSuggestion[],
      actorAlmost: [] as AlmostActor[],
      genreSuggestions: [] as GenreSuggestion[],
      genreAlmost: [] as AlmostGenre[],
      decadeSuggestions: [] as DecadeSuggestion[],
      decadeAlmost: [] as AlmostDecade[],
    };
  }

  // Build sets for filtering: saved directors and dismissed suggestions
  const dismissedRaw = cookieStore.get('ready_made_dismissed')?.value;
  const dismissedActorsRaw = cookieStore.get('ready_made_dismissed_actors')?.value;
  const dismissedGenresRaw = cookieStore.get('ready_made_dismissed_genres')?.value;
  const dismissedDecadesRaw = cookieStore.get('ready_made_dismissed_decades')?.value;
  let dismissed: Set<string> = new Set();
  let dismissedActors: Set<string> = new Set();
  let dismissedGenres: Set<string> = new Set();
  let dismissedDecades: Set<string> = new Set();
  try {
    dismissed = new Set((dismissedRaw ? JSON.parse(dismissedRaw) : []) as string[]);
  } catch {}
  try {
    dismissedActors = new Set((dismissedActorsRaw ? JSON.parse(dismissedActorsRaw) : []) as string[]);
  } catch {}
  try {
    dismissedGenres = new Set((dismissedGenresRaw ? JSON.parse(dismissedGenresRaw) : []) as string[]);
  } catch {}
  try {
    dismissedDecades = new Set((dismissedDecadesRaw ? JSON.parse(dismissedDecadesRaw) : []) as string[]);
  } catch {}

  const { data: listsForUser } = await supabase
    .from('movie_lists')
    .select('name')
    .eq('user_id', user.id);
  const savedDirectors = new Set<string>();
  const savedActors = new Set<string>();
  const savedGenres = new Set<string>();
  const savedDecades = new Set<string>();
  for (const row of listsForUser || []) {
    const n = (row as any).name as string;
    if (!n) continue;
    if (n.startsWith('Actor - ')) {
      // Actor - Name: 12 You've Seen
      const afterPrefix = n.substring('Actor - '.length).split(':')[0]?.trim();
      if (afterPrefix) savedActors.add(afterPrefix);
    } else if (n.startsWith('Genre - ')) {
      const afterPrefix = n.substring('Genre - '.length).split(':')[0]?.trim();
      if (afterPrefix) savedGenres.add(afterPrefix);
    } else if (n.startsWith('Decade - ')) {
      const afterPrefix = n.substring('Decade - '.length).split(':')[0]?.trim();
      if (afterPrefix) savedDecades.add(afterPrefix);
    } else {
      const dir = n.split(':')[0]?.trim();
      if (dir) savedDirectors.add(dir);
    }
  }

  // Count seen per director for this user
  const { data: counts, error: countErr } = await supabase
    .from('rankings')
    .select('seen_it, movie:movies(director, cast_list, genres, release_year)')
    .eq('user_id', user.id)
    .eq('seen_it', true);

  if (countErr) {
    console.warn('ready-made counts error', countErr);
    return {
      user,
      suggestions: [] as DirectorSuggestion[],
      almost: [] as AlmostDirector[],
      actorSuggestions: [] as ActorSuggestion[],
      actorAlmost: [] as AlmostActor[],
      genreSuggestions: [] as GenreSuggestion[],
      genreAlmost: [] as AlmostGenre[],
      decadeSuggestions: [] as DecadeSuggestion[],
      decadeAlmost: [] as AlmostDecade[],
    };
  }

  const byDirector = new Map<string, number>();
  const byActor = new Map<string, number>();
  const byGenre = new Map<string, number>();
  const byDecade = new Map<number, number>(); // key = decade start year
  for (const row of (counts as any[] | null) || []) {
    const mv: any = (row as any).movie;
    const record = Array.isArray(mv) ? mv?.[0] : mv;
    const dir: string | null = record?.director ?? null;
    if (dir) byDirector.set(dir, (byDirector.get(dir) || 0) + 1);
    const castArr: string[] | null = record?.cast_list ?? null;
    if (Array.isArray(castArr)) {
      for (const actor of castArr) {
        if (!actor) continue;
        byActor.set(actor, (byActor.get(actor) || 0) + 1);
      }
    }
    const genresArr: string[] | null = record?.genres ?? null;
    if (Array.isArray(genresArr)) {
      for (const g of genresArr) {
        if (!g) continue;
        byGenre.set(g, (byGenre.get(g) || 0) + 1);
      }
    }
    const year: number | null = record?.release_year ?? null;
    if (year && year >= 1900) {
      const decadeStart = Math.floor(year / 10) * 10;
      byDecade.set(decadeStart, (byDecade.get(decadeStart) || 0) + 1);
    }
  }
  // Genre suggestions (ready >=10, almost 6-9)
  const genreCandidates = [...byGenre.entries()]
    .filter(([genre, c]) => c >= 10 && !savedGenres.has(genre) && !dismissedGenres.has(genre))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const genreAlmost = [...byGenre.entries()]
    .filter(([genre, c]) => c >= 6 && c < 10 && !savedGenres.has(genre) && !dismissedGenres.has(genre))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([genre, seen_count]) => ({ genre, seen_count }));

  // Decade suggestions (ready >=12, almost 7-11)
  const decadeCandidates = [...byDecade.entries()]
    .filter(([start, c]) => c >= 12 && !savedDecades.has(`${start}s`) && !dismissedDecades.has(`${start}s`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const decadeAlmost = [...byDecade.entries()]
    .filter(([start, c]) => c >= 7 && c < 12 && !savedDecades.has(`${start}s`) && !dismissedDecades.has(`${start}s`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([start, seen_count]) => ({ decade: `${start}s`, startYear: start, seen_count }));

  const genreSuggestions: GenreSuggestion[] = [];
  for (const [genre, seen_count] of genreCandidates) {
    const { data: items } = await supabase
      .from('rankings')
      .select('ranking, seen_it, movie:movies(id, title, poster_url, cached_poster_url, release_year, genres)')
      .eq('user_id', user.id)
      .eq('seen_it', true);
    let movies = ((((items as any[] | null) || [])
      .filter((r) => {
        const mv: any = r.movie;
        const m = Array.isArray(mv) ? mv?.[0] : mv;
        return Array.isArray(m?.genres) && m.genres.includes(genre);
      })
      .map((r) => {
        const mv: any = r.movie;
        const m = Array.isArray(mv) ? mv?.[0] : mv;
        if (!m) return null;
        return {
          id: m.id as number,
          title: m.title as string,
          release_year: (m.release_year as number | null) ?? null,
          poster_url: (m.cached_poster_url as string | null) ?? (m.poster_url as string | null),
          ranking: (r.ranking as number | null) ?? null,
          seen_it: !!r.seen_it,
        };
      })
      .filter(Boolean)) as GenreSuggestion['movies'])
      .sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));
    if (seen_count > 100) {
      movies = movies.filter((m) => (m.ranking ?? 0) >= 9);
    }
    genreSuggestions.push({ genre, seen_count, movies });
  }

  const decadeSuggestions: DecadeSuggestion[] = [];
  for (const [startYear, seen_count] of decadeCandidates) {
    const { data: items } = await supabase
      .from('rankings')
      .select('ranking, seen_it, movie:movies(id, title, poster_url, cached_poster_url, release_year)')
      .eq('user_id', user.id)
      .eq('seen_it', true);
    let movies = ((((items as any[] | null) || [])
      .filter((r) => {
        const mv: any = r.movie;
        const m = Array.isArray(mv) ? mv?.[0] : mv;
        const yr: number | null = m?.release_year ?? null;
        return yr != null && yr >= startYear && yr < startYear + 10;
      })
      .map((r) => {
        const mv: any = r.movie;
        const m = Array.isArray(mv) ? mv?.[0] : mv;
        if (!m) return null;
        return {
          id: m.id as number,
          title: m.title as string,
          release_year: (m.release_year as number | null) ?? null,
          poster_url: (m.cached_poster_url as string | null) ?? (m.poster_url as string | null),
          ranking: (r.ranking as number | null) ?? null,
          seen_it: !!r.seen_it,
        };
      })
      .filter(Boolean)) as DecadeSuggestion['movies'])
      .sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));
    if (seen_count > 100) {
      movies = movies.filter((m) => (m.ranking ?? 0) >= 9);
    }
    decadeSuggestions.push({ decade: `${startYear}s`, startYear, seen_count, movies });
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

  // Actor suggestions
  const actorCandidates = [...byActor.entries()]
    .filter(([actor, c]) => c >= 10 && !savedActors.has(actor) && !dismissedActors.has(actor))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const actorAlmost = [...byActor.entries()]
    .filter(([actor, c]) => c >= 6 && c < 10 && !savedActors.has(actor) && !dismissedActors.has(actor))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([actor, seen_count]) => ({ actor, seen_count }));

  const actorSuggestions: ActorSuggestion[] = [];
  for (const [actor, seen_count] of actorCandidates) {
    // Fetch this user's movies where cast_list includes actor
    const { data: items } = await supabase
      .from('rankings')
      .select('ranking, seen_it, movie:movies(id, title, poster_url, cached_poster_url, release_year, cast_list)')
      .eq('user_id', user.id)
      .eq('seen_it', true);
    const movies = ((((items as any[] | null) || [])
      .filter((r) => {
        const mv: any = r.movie;
        const m = Array.isArray(mv) ? mv?.[0] : mv;
        return Array.isArray(m?.cast_list) && m.cast_list.includes(actor);
      })
      .map((r) => {
        const mv: any = r.movie;
        const m = Array.isArray(mv) ? mv?.[0] : mv;
        if (!m) return null;
        return {
          id: m.id as number,
          title: m.title as string,
          release_year: (m.release_year as number | null) ?? null,
          poster_url: (m.cached_poster_url as string | null) ?? (m.poster_url as string | null),
          ranking: (r.ranking as number | null) ?? null,
          seen_it: !!r.seen_it,
        };
      })
      .filter(Boolean)) as ActorSuggestion['movies'])
      .sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));
    actorSuggestions.push({ actor, seen_count, movies });
  }

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

  return { user, suggestions, almost, actorSuggestions, actorAlmost, genreSuggestions, genreAlmost, decadeSuggestions, decadeAlmost };
}

export const dynamic = 'force-dynamic';

export default async function ReadyMadeListsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const activeTab = (sp?.tab ?? 'all') as 'all' | 'directors' | 'actors' | 'genres' | 'decades';
  const { user, suggestions, almost, actorSuggestions, actorAlmost, genreSuggestions, genreAlmost, decadeSuggestions, decadeAlmost } = await getSuggestions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-unbounded">Ready‑Made Lists</h1>
        <p className="mt-2 text-gray-400">Auto-generated lists based on your watching habits. These are private until you choose to save them.</p>
      </div>

      {!user ? (
        <div className="p-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
          <h2 className="mb-2 text-xl font-semibold">Ready‑Made Lists</h2>
            <p className="text-gray-300">Sign in to unlock director-based ready-made lists once you have enough ranked & seen films. We’ll start generating them automatically after you mark at least 10 movies by a director as seen.</p>
            <Link href="/login" className="inline-block px-4 py-2 mt-4 text-black bg-yellow-500 rounded">Sign In</Link>
        </div>
      ) : (
        <>
          <ReadyMadeTabs
            counts={{
              all:
                (suggestions?.length ?? 0) +
                (actorSuggestions?.length ?? 0) +
                (genreSuggestions?.length ?? 0) +
                (decadeSuggestions?.length ?? 0),
              directors: { ready: suggestions?.length ?? 0, almost: almost?.length ?? 0 },
              actors: { ready: actorSuggestions?.length ?? 0, almost: actorAlmost?.length ?? 0 },
              genres: { ready: genreSuggestions?.length ?? 0, almost: genreAlmost?.length ?? 0 },
              decades: { ready: decadeSuggestions?.length ?? 0, almost: decadeAlmost?.length ?? 0 },
            }}
          />
          {activeTab === 'all' && suggestions.length === 0 && actorSuggestions.length === 0 && genreSuggestions.length === 0 && decadeSuggestions.length === 0 && (
            <div className="p-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
              <p className="text-gray-300">No Ready‑Made lists yet. Watch and mark at least 10 movies by a director to unlock one.</p>
              <Link href="/lists" className="inline-block mt-4 text-yellow-400 underline">Go to your lists</Link>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'genres') && genreSuggestions.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-1 text-xl font-semibold">Genre Ready‑Made Lists</h2>
              <p className="mb-3 text-sm text-gray-400">Unlocks at 10 seen. Large genres show 9–10 only.</p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {genreSuggestions.map((g) => (
                  <GenreSuggestionCard key={g.genre} suggestion={g} />
                ))}
              </div>
            </div>
          )}
          {(activeTab === 'genres') && genreSuggestions.length === 0 && genreAlmost.length === 0 && (
            <div className="p-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
              <p className="text-gray-300">No Genre suggestions yet. Watch and mark more films to unlock genre lists.</p>
              <div className="mt-3 text-sm">
                <Link href="/films" className="text-yellow-300 hover:underline">Browse films</Link>
                <span className="mx-2 text-gray-500">•</span>
                <Link href="/rankings" className="text-yellow-300 hover:underline">Go to your rankings</Link>
              </div>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'decades') && decadeSuggestions.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-1 text-xl font-semibold">Decade Ready‑Made Lists</h2>
              <p className="mb-3 text-sm text-gray-400">Unlocks at 12 seen. Large decades show 9–10 only.</p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {decadeSuggestions.map((d) => (
                  <DecadeSuggestionCard key={d.decade} suggestion={d} />
                ))}
              </div>
            </div>
          )}
          {(activeTab === 'decades') && decadeSuggestions.length === 0 && decadeAlmost.length === 0 && (
            <div className="p-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
              <p className="text-gray-300">No Decade suggestions yet. Watch and mark more films to unlock decade lists.</p>
              <div className="mt-3 text-sm">
                <Link href="/films" className="text-yellow-300 hover:underline">Browse films</Link>
                <span className="mx-2 text-gray-500">•</span>
                <Link href="/rankings" className="text-yellow-300 hover:underline">Go to your rankings</Link>
              </div>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'genres') && genreAlmost.length > 0 && (
            <div className="p-5 mt-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Almost Ready (Genres)</h2>
                <span className="inline-flex items-center justify-center text-yellow-400 bg-gray-800 rounded-full w-7 h-7" title="Locked until 10 seen" aria-label="Locked until 10 seen">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-400">Genres you are close to unlocking.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {genreAlmost.map((g) => (
                  <div key={g.genre} className="p-3 rounded-md bg-gray-800/50">
                    <div className="font-medium text-white truncate" title={g.genre}>{g.genre}</div>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <div className="flex-1 min-w-0">
                        <div className="h-2 bg-gray-700 rounded">
                          <div className="h-2 bg-yellow-500 rounded" style={{ width: `${Math.min(100, (g.seen_count/10)*100)}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-gray-400">{g.seen_count} of 10 seen • {Math.max(0, 10 - g.seen_count)} away</div>
                      </div>
                      <span className="inline-flex items-center justify-center text-gray-300 bg-gray-700 rounded-full w-7 h-7" title="Locked until 10 seen">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'decades') && decadeAlmost.length > 0 && (
            <div className="p-5 mt-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Almost Ready (Decades)</h2>
                <span className="inline-flex items-center justify-center text-yellow-400 bg-gray-800 rounded-full w-7 h-7" title="Locked until 12 seen" aria-label="Locked until 12 seen">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-400">Decades you are close to unlocking (needs 12 seen).</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {decadeAlmost.map((d) => (
                  <div key={d.decade} className="p-3 rounded-md bg-gray-800/50">
                    <div className="font-medium text-white truncate" title={d.decade}>{d.decade}</div>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <div className="flex-1 min-w-0">
                        <div className="h-2 bg-gray-700 rounded">
                          <div className="h-2 bg-yellow-500 rounded" style={{ width: `${Math.min(100, (d.seen_count/12)*100)}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-gray-400">{d.seen_count} of 12 seen • {Math.max(0, 12 - d.seen_count)} away</div>
                      </div>
                      <span className="inline-flex items-center justify-center text-gray-300 bg-gray-700 rounded-full w-7 h-7" title="Locked until 12 seen">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'directors') && suggestions.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {suggestions.map((s) => (
                <SuggestionCard key={s.director} suggestion={s} />
              ))}
            </div>
          )}
          {(activeTab === 'directors') && suggestions.length === 0 && almost.length === 0 && (
            <div className="p-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
              <p className="text-gray-300">No Director suggestions yet. Watch and mark more films to unlock director lists.</p>
              <div className="mt-3 text-sm">
                <Link href="/films" className="text-yellow-300 hover:underline">Browse films</Link>
                <span className="mx-2 text-gray-500">•</span>
                <Link href="/rankings" className="text-yellow-300 hover:underline">Go to your rankings</Link>
              </div>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'actors') && actorSuggestions.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-3 text-xl font-semibold">Actor Ready‑Made Lists</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {actorSuggestions.map((a) => (
                  <ActorSuggestionCard key={a.actor} suggestion={a} />
                ))}
              </div>
            </div>
          )}
          {(activeTab === 'actors') && actorSuggestions.length === 0 && actorAlmost.length === 0 && (
            <div className="p-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
              <p className="text-gray-300">No Actor suggestions yet. Watch and mark more films to unlock actor lists.</p>
              <div className="mt-3 text-sm">
                <Link href="/films" className="text-yellow-300 hover:underline">Browse films</Link>
                <span className="mx-2 text-gray-500">•</span>
                <Link href="/rankings" className="text-yellow-300 hover:underline">Go to your rankings</Link>
              </div>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'directors') && almost.length > 0 && (
            <div className="p-5 mt-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Almost Ready</h2>
                <span className="inline-flex items-center justify-center text-yellow-400 bg-gray-800 rounded-full w-7 h-7" title="Locked until 10 seen" aria-label="Locked until 10 seen">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                  <span className="sr-only">Locked until 10 seen</span>
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-400">Hit 10 seen films to unlock a Ready‑Made list. You can preview details with View.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {almost.map((a) => (
                  <div key={a.director} className="p-3 rounded-md bg-gray-800/50">
                    <Link href={`/lists/ready-made/${slugifyTitle(a.director)}`} className="font-medium leading-snug text-white hover:text-yellow-200">
                      {a.director}
                    </Link>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <div className="flex-1 min-w-0">
                        <div className="h-2 bg-gray-700 rounded">
                          <div className="h-2 bg-yellow-500 rounded" style={{ width: `${Math.min(100, (a.seen_count/10)*100)}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-gray-400">{a.seen_count} of 10 seen • {Math.max(0, 10 - a.seen_count)} away</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center text-gray-300 bg-gray-700 rounded-full w-7 h-7" title="Locked until 10 seen" aria-label="Locked until 10 seen">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                        </span>
                        <Link href={`/lists/ready-made/${slugifyTitle(a.director)}`} className="text-xs text-yellow-300 hover:underline whitespace-nowrap">View</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(activeTab === 'all' || activeTab === 'actors') && actorAlmost.length > 0 && (
            <div className="p-5 mt-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Almost Ready (Actors)</h2>
                <span className="inline-flex items-center justify-center text-yellow-400 bg-gray-800 rounded-full w-7 h-7" title="Locked until 10 seen" aria-label="Locked until 10 seen">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                  <span className="sr-only">Locked until 10 seen</span>
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-400">Actors you are close to unlocking.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {actorAlmost.map((a) => (
                  <div key={a.actor} className="p-3 rounded-md bg-gray-800/50">
                    <div className="font-medium text-white truncate" title={a.actor}>{a.actor}</div>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <div className="flex-1 min-w-0">
                        <div className="h-2 bg-gray-700 rounded">
                          <div className="h-2 bg-yellow-500 rounded" style={{ width: `${Math.min(100, (a.seen_count/10)*100)}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] text-gray-400">{a.seen_count} of 10 seen • {Math.max(0, 10 - a.seen_count)} away</div>
                      </div>
                      <span className="inline-flex items-center justify-center text-gray-300 bg-gray-700 rounded-full w-7 h-7" title="Locked until 10 seen">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>
                      </span>
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
function formatActorListName(actor: string, count: number) {
  return `Actor - ${actor}: ${count} You’ve Seen`;
}
function formatGenreListName(genre: string, count: number) {
  return `Genre - ${genre}: ${count} You’ve Seen`;
}
function formatDecadeListName(decade: string, count: number) {
  return `Decade - ${decade}: ${count} You’ve Seen`;
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

async function dismissActorSuggestion(formData: FormData) {
  'use server';
  const actor = String(formData.get('actor') || '').trim();
  if (!actor) redirect('/lists/ready-made');
  const cookieStore = await cookies();
  const key = 'ready_made_dismissed_actors';
  let current: string[] = [];
  try {
    const raw = cookieStore.get(key)?.value;
    current = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {}
  if (!current.includes(actor)) current.push(actor);
  cookieStore.set({ name: key, value: JSON.stringify(current), httpOnly: false, sameSite: 'lax', path: '/' });
  redirect('/lists/ready-made');
}

async function dismissGenreSuggestion(formData: FormData) {
  'use server';
  const genre = String(formData.get('genre') || '').trim();
  if (!genre) redirect('/lists/ready-made');
  const cookieStore = await cookies();
  const key = 'ready_made_dismissed_genres';
  let current: string[] = [];
  try {
    const raw = cookieStore.get(key)?.value;
    current = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {}
  if (!current.includes(genre)) current.push(genre);
  cookieStore.set({ name: key, value: JSON.stringify(current), httpOnly: false, sameSite: 'lax', path: '/' });
  redirect('/lists/ready-made');
}

async function dismissDecadeSuggestion(formData: FormData) {
  'use server';
  const decade = String(formData.get('decade') || '').trim();
  if (!decade) redirect('/lists/ready-made');
  const cookieStore = await cookies();
  const key = 'ready_made_dismissed_decades';
  let current: string[] = [];
  try {
    const raw = cookieStore.get(key)?.value;
    current = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {}
  if (!current.includes(decade)) current.push(decade);
  cookieStore.set({ name: key, value: JSON.stringify(current), httpOnly: false, sameSite: 'lax', path: '/' });
  redirect('/lists/ready-made');
}

async function saveActorList(formData: FormData) {
  'use server';
  const actor = String(formData.get('actor') || '');
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
        getAll() { return cookieStore.getAll(); }, setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  // Fallback derive actor movie IDs
  if (ids.length === 0 && actor) {
    const { data: movieRows } = await supabase.from('movies').select('id, cast_list');
    const candidateIds = (movieRows || []).filter((m: any) => Array.isArray(m.cast_list) && m.cast_list.includes(actor)).map((m: any) => m.id as number);
    if (candidateIds.length) {
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', candidateIds);
      ids = Array.from(new Set((rankRows || []).sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0))).map((r) => r.movie_id as number)));
    }
  }
  const name = formatActorListName(actor, count);
  const { data: existingList } = await supabase
    .from('movie_lists')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name)
    .maybeSingle();
  let listId: string | null = existingList?.id ?? null;
  if (!listId) {
    const { data: listRows } = await supabase
      .from('movie_lists')
      .insert({ user_id: user.id, name, description: `Auto-generated list of films featuring ${actor}`, is_public: false })
      .select('id')
      .limit(1);
    if (!listRows?.[0]) redirect('/lists');
    listId = listRows[0].id as string;
  }
  const { data: existingItems } = await supabase
    .from('movie_list_items')
    .select('movie_id')
    .eq('list_id', listId);
  const existingIds = new Set((existingItems || []).map((r) => r.movie_id));
  const newIds = ids.filter((id) => !existingIds.has(id));
  if (newIds.length) {
    const nextStart = (existingItems?.length || 0) + newIds.length;
    const items = newIds.map((movie_id, idx) => ({ list_id: listId!, movie_id, ranking: nextStart - idx }));
    await supabase.from('movie_list_items').insert(items);
  }
  await supabase.from('movie_lists').update({ updated_at: new Date().toISOString() }).eq('id', listId);
  redirect('/lists');
}

async function saveGenreList(formData: FormData) {
  'use server';
  const genre = String(formData.get('genre') || '');
  const count = Number(formData.get('count') || 0);
  const totalSeen = Number(formData.get('total_seen') || 0);
  let ids = String(formData.get('movie_ids') || '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (ids.length === 0 && genre) {
    const { data: movieRows } = await supabase.from('movies').select('id, genres');
    const candidateIds = (movieRows || []).filter((m: any) => Array.isArray(m.genres) && m.genres.includes(genre)).map((m: any) => m.id as number);
    if (candidateIds.length) {
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', candidateIds);
      const rows = (rankRows || []);
      const filtered = totalSeen > 100 ? rows.filter((r) => (r.ranking ?? 0) >= 9) : rows;
      ids = Array.from(new Set(filtered.sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0))).map((r) => r.movie_id as number)));
    }
  }
  const name = formatGenreListName(genre, count);
  const { data: existingList } = await supabase
    .from('movie_lists')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name)
    .maybeSingle();
  let listId: string | null = existingList?.id ?? null;
  if (!listId) {
    const { data: listRows } = await supabase
      .from('movie_lists')
      .insert({ user_id: user.id, name, description: `Auto-generated list for ${genre}`, is_public: false })
      .select('id')
      .limit(1);
    if (!listRows?.[0]) redirect('/lists');
    listId = listRows[0].id as string;
  }
  const { data: existingItems } = await supabase
    .from('movie_list_items')
    .select('movie_id')
    .eq('list_id', listId);
  const existingIds = new Set((existingItems || []).map((r) => r.movie_id));
  const newIds = ids.filter((id) => !existingIds.has(id));
  if (newIds.length) {
    const nextStart = (existingItems?.length || 0) + newIds.length;
    const items = newIds.map((movie_id, idx) => ({ list_id: listId!, movie_id, ranking: nextStart - idx }));
    await supabase.from('movie_list_items').insert(items);
  }
  await supabase.from('movie_lists').update({ updated_at: new Date().toISOString() }).eq('id', listId);
  redirect('/lists');
}

async function saveDecadeList(formData: FormData) {
  'use server';
  const decade = String(formData.get('decade') || ''); // e.g. 1990s
  const startYear = Number(formData.get('start_year') || 0);
  const count = Number(formData.get('count') || 0);
  const totalSeen = Number(formData.get('total_seen') || 0);
  let ids = String(formData.get('movie_ids') || '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (ids.length === 0 && startYear) {
    const { data: movieRows } = await supabase
      .from('movies')
      .select('id, release_year');
    const candidateIds = (movieRows || [])
      .filter((m: any) => typeof m.release_year === 'number' && m.release_year >= startYear && m.release_year < startYear + 10)
      .map((m: any) => m.id as number);
    if (candidateIds.length) {
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', candidateIds);
      const rows = (rankRows || []);
      const filtered = totalSeen > 100 ? rows.filter((r) => (r.ranking ?? 0) >= 9) : rows;
      ids = Array.from(new Set(filtered.sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0))).map((r) => r.movie_id as number)));
    }
  }
  const name = formatDecadeListName(decade, count);
  const { data: existingList } = await supabase
    .from('movie_lists')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name)
    .maybeSingle();
  let listId: string | null = existingList?.id ?? null;
  if (!listId) {
    const { data: listRows } = await supabase
      .from('movie_lists')
      .insert({ user_id: user.id, name, description: `Auto-generated list for the ${decade}`, is_public: false })
      .select('id')
      .limit(1);
    if (!listRows?.[0]) redirect('/lists');
    listId = listRows[0].id as string;
  }
  const { data: existingItems } = await supabase
    .from('movie_list_items')
    .select('movie_id')
    .eq('list_id', listId);
  const existingIds = new Set((existingItems || []).map((r) => r.movie_id));
  const newIds = ids.filter((id) => !existingIds.has(id));
  if (newIds.length) {
    const nextStart = (existingItems?.length || 0) + newIds.length;
    const items = newIds.map((movie_id, idx) => ({ list_id: listId!, movie_id, ranking: nextStart - idx }));
    await supabase.from('movie_list_items').insert(items);
  }
  await supabase.from('movie_lists').update({ updated_at: new Date().toISOString() }).eq('id', listId);
  redirect('/lists');
}

function SuggestionCard({ suggestion }: { suggestion: DirectorSuggestion }) {
  const ids = suggestion.movies.map((m) => m.id).join(',');
  const posterUrls = suggestion.movies
    .map((m) => m.poster_url)
    .filter((u): u is string => !!u)
    .slice(0, 5);
  const href = `/lists/ready-made/${slugifyTitle(suggestion.director)}`;
  return (
    <ReadyMadeCard
      title={suggestion.director}
      count={suggestion.seen_count}
      posterUrls={posterUrls}
      subtitle={<span>Auto-generated from your seen films • Director</span>}
      headerRight={(
        <form action={saveList}>
          <input type="hidden" name="director" value={suggestion.director} />
          <input type="hidden" name="count" value={suggestion.seen_count} />
          <input type="hidden" name="movie_ids" value={ids} />
          <button className="px-3 py-1.5 text-sm bg-yellow-500 text-black rounded hover:bg-yellow-400" type="submit">Save</button>
        </form>
      )}
      viewHref={href}
      dismissForm={(
        <form action={dismissSuggestion}>
          <input type="hidden" name="director" value={suggestion.director} />
          <button className="text-sm text-gray-400 hover:text-gray-300" type="submit" title="Hide this suggestion">Dismiss</button>
        </form>
      )}
    />
  );
}

function ActorSuggestionCard({ suggestion }: { suggestion: ActorSuggestion }) {
  const ids = suggestion.movies.map((m) => m.id).join(',');
  const posterUrls = suggestion.movies
    .map((m) => m.poster_url)
    .filter((u): u is string => !!u)
    .slice(0, 5);
  return (
    <ReadyMadeCard
      title={suggestion.actor}
      count={suggestion.seen_count}
      posterUrls={posterUrls}
      subtitle={<span>Auto-generated from your seen films • Actor</span>}
      headerRight={(
        <form action={saveActorList}>
          <input type="hidden" name="actor" value={suggestion.actor} />
          <input type="hidden" name="count" value={suggestion.seen_count} />
          <input type="hidden" name="movie_ids" value={ids} />
          <button className="px-3 py-1.5 text-sm bg-yellow-500 text-black rounded hover:bg-yellow-400" type="submit">Save</button>
        </form>
      )}
      viewHref={`/lists/ready-made/${slugifyTitle(suggestion.actor)}`}
      dismissForm={(
        <form action={dismissActorSuggestion}>
          <input type="hidden" name="actor" value={suggestion.actor} />
          <button className="text-sm text-gray-400 hover:text-gray-300" type="submit" title="Hide this suggestion">Dismiss</button>
        </form>
      )}
    />
  );
}

function GenreSuggestionCard({ suggestion }: { suggestion: GenreSuggestion }) {
  const totalSeen = suggestion.seen_count;
  const filteredCount = suggestion.movies.length;
  const ids = suggestion.movies.map((m) => m.id).join(',');
  const posterUrls = suggestion.movies
    .map((m) => m.poster_url)
    .filter((u): u is string => !!u)
    .slice(0, 5);
  const href = `/lists/ready-made/${slugifyTitle(suggestion.genre)}`;
  return (
    <ReadyMadeCard
      title={suggestion.genre}
      count={filteredCount}
      asterisk={totalSeen > 100}
      posterUrls={posterUrls}
      subtitle={(
        <span>
          Auto-generated from your seen films • Genre
          {totalSeen > 100 && (<span className="ml-2 text-[11px] text-yellow-300">(showing 9–10 only)</span>)}
        </span>
      )}
      headerRight={(
        <form action={saveGenreList} className="shrink-0">
          <input type="hidden" name="genre" value={suggestion.genre} />
          <input type="hidden" name="count" value={filteredCount} />
          <input type="hidden" name="total_seen" value={totalSeen} />
          <input type="hidden" name="movie_ids" value={ids} />
          <button className="px-3 py-1.5 text-sm bg-yellow-500 text-black rounded hover:bg-yellow-400" type="submit">Save</button>
        </form>
      )}
      viewHref={href}
      dismissForm={(
        <form action={dismissGenreSuggestion}>
          <input type="hidden" name="genre" value={suggestion.genre} />
          <button className="text-sm text-gray-400 hover:text-gray-300" type="submit" title="Hide this suggestion">Dismiss</button>
        </form>
      )}
    />
  );
}

function DecadeSuggestionCard({ suggestion }: { suggestion: DecadeSuggestion }) {
  const totalSeen = suggestion.seen_count;
  const filteredCount = suggestion.movies.length;
  const ids = suggestion.movies.map((m) => m.id).join(',');
  const posterUrls = suggestion.movies
    .map((m) => m.poster_url)
    .filter((u): u is string => !!u)
    .slice(0, 5);
  const href = `/lists/ready-made/${slugifyTitle(suggestion.decade)}`;
  return (
    <ReadyMadeCard
      title={suggestion.decade}
      count={filteredCount}
      asterisk={totalSeen > 100}
      posterUrls={posterUrls}
      subtitle={(
        <span>
          Auto-generated from your seen films • Decade
          {totalSeen > 100 && (<span className="ml-2 text-[11px] text-yellow-300">(showing 9–10 only)</span>)}
        </span>
      )}
      headerRight={(
        <form action={saveDecadeList} className="shrink-0">
          <input type="hidden" name="decade" value={suggestion.decade} />
          <input type="hidden" name="start_year" value={suggestion.startYear} />
          <input type="hidden" name="count" value={filteredCount} />
          <input type="hidden" name="total_seen" value={totalSeen} />
          <input type="hidden" name="movie_ids" value={ids} />
          <button className="px-3 py-1.5 text-sm bg-yellow-500 text-black rounded hover:bg-yellow-400" type="submit">Save</button>
        </form>
      )}
      viewHref={href}
      dismissForm={(
        <form action={dismissDecadeSuggestion}>
          <input type="hidden" name="decade" value={suggestion.decade} />
          <button className="text-sm text-gray-400 hover:text-gray-300" type="submit" title="Hide this suggestion">Dismiss</button>
        </form>
      )}
    />
  );
}

