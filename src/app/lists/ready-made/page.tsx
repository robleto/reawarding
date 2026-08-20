import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { isPremiumUser } from '@/lib/premium';
import { redirect } from 'next/navigation';
import { normalizeImageUrl } from '@/utils/imageUrl';
import Image from 'next/image';
import Link from 'next/link';
import { slugifyTitle } from '@/utils/slug';
import ReadyMadeCard from '@/components/lists/ReadyMadeCard';
import ReadyMadeSuggestionDetail from '@/components/lists/ReadyMadeSuggestionDetail';
import ReadyMadeCarousel, { type ReadyMadeSlide } from '@/components/lists/ReadyMadeCarousel';
import RatingChip from '@/components/ui/RatingChip';
import { Lock } from 'lucide-react';

// "Almost Ready" suggestions render as the exact same ReadyMadeCard shell as
// a ready one (View + Dismiss, same fan-of-posters) instead of a separate
// compact-progress panel — the only visual difference is these two slots: a
// dot-by-dot progress readout standing in for the movies preview, and a
// locked "X more to unlock" bar standing in for the Save button. See
// AlmostProgressMeta / AlmostLockedPill below, used by the four Almost*Card
// factories.
function AlmostProgressMeta({ seenCount, threshold }: { seenCount: number; threshold: number }) {
  const remaining = Math.max(0, threshold - seenCount);
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[200px]">
        {Array.from({ length: threshold }, (_, i) => (
          <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < seenCount ? "bg-gold-400" : "bg-white/10"}`} />
        ))}
      </div>
      <p className="text-sm text-gray-300">
        <span className="font-mono font-semibold text-gold-300">{seenCount}</span> of {threshold} seen
        <span className="block mt-0.5 text-xs text-gray-500">{remaining} more to unlock this list</span>
      </p>
    </div>
  );
}

function AlmostLockedPill({ seenCount, threshold }: { seenCount: number; threshold: number }) {
  const remaining = Math.max(0, threshold - seenCount);
  return (
    <div
      className="flex items-center justify-center gap-1.5 w-full h-11 rounded-full text-sm font-medium text-gray-400 bg-white/5 border border-white/10"
      title={`Locked until ${threshold} seen`}
    >
      <Lock className="w-3.5 h-3.5" />
      {remaining} more to unlock
    </div>
  );
}

// Shared Dismiss button — was duplicated inline (identical structure, only
// the field name/value differ) across all eight card factories below.
function DismissButton({
  action,
  fieldName,
  value,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fieldName: string;
  value: string;
}) {
  return (
    <form action={action} className="flex-1">
      <input type="hidden" name={fieldName} value={value} />
      <button
        type="submit"
        title="Hide this suggestion"
        className="w-full inline-flex items-center justify-center h-10 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-gray-300 transition-colors"
      >
        Dismiss
      </button>
    </form>
  );
}

// Shared Save button — the primary action for a ready-to-save suggestion,
// promoted to a full-width row (was a small corner pill).
function SaveButton({
  action,
  hidden,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string | number>;
}) {
  return (
    <form action={action}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        className="w-full h-11 rounded-full bg-gold-500 text-black font-semibold text-sm hover:bg-gold-400 transition-colors"
      >
        Save this list
      </button>
    </form>
  );
}

type DirectorSuggestion = {
  director: string;
  seen_count: number;
  movies: Array<{
    id: string;
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
    id: string;
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
    id: string;
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
    id: string;
    title: string;
    release_year: number | null;
    poster_url: string | null;
    ranking: number | null;
    seen_it: boolean;
  }>;
};

type AlmostDirector = { director: string; seen_count: number; posterUrls: string[] };
type AlmostActor = { actor: string; seen_count: number; posterUrls: string[] };
type AlmostGenre = { genre: string; seen_count: number; posterUrls: string[] };
type AlmostDecade = { decade: string; startYear: number; seen_count: number; posterUrls: string[] };

async function getSuggestions() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();

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
    .select('seen_it, movie:movies(poster_url, director, cast_list, genres, release_year)')
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
  // Small poster previews (capped at 5 each) for the fan-of-posters card art —
  // gathered from this same pass so "Almost Ready" cards get real posters too,
  // without an extra round-trip per suggestion.
  const byDirectorPosters = new Map<string, string[]>();
  const byActorPosters = new Map<string, string[]>();
  const byGenrePosters = new Map<string, string[]>();
  const byDecadePosters = new Map<number, string[]>();
  const pushPoster = <K,>(map: Map<K, string[]>, key: K, url: string | null | undefined) => {
    if (!url) return;
    const arr = map.get(key) || [];
    if (arr.length < 5) {
      arr.push(url);
      map.set(key, arr);
    }
  };
  for (const row of (counts as any[] | null) || []) {
    const mv: any = (row as any).movie;
    const record = Array.isArray(mv) ? mv?.[0] : mv;
    const poster: string | null = record?.poster_url ?? null;
    const dir: string | null = record?.director ?? null;
    if (dir) {
      byDirector.set(dir, (byDirector.get(dir) || 0) + 1);
      pushPoster(byDirectorPosters, dir, poster);
    }
    const castArr: string[] | null = record?.cast_list ?? null;
    if (Array.isArray(castArr)) {
      for (const actor of castArr) {
        if (!actor) continue;
        byActor.set(actor, (byActor.get(actor) || 0) + 1);
        pushPoster(byActorPosters, actor, poster);
      }
    }
    const genresArr: string[] | null = record?.genres ?? null;
    if (Array.isArray(genresArr)) {
      for (const g of genresArr) {
        if (!g) continue;
        byGenre.set(g, (byGenre.get(g) || 0) + 1);
        pushPoster(byGenrePosters, g, poster);
      }
    }
    const year: number | null = record?.release_year ?? null;
    if (year && year >= 1900) {
      const decadeStart = Math.floor(year / 10) * 10;
      byDecade.set(decadeStart, (byDecade.get(decadeStart) || 0) + 1);
      pushPoster(byDecadePosters, decadeStart, poster);
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
    .map(([genre, seen_count]) => ({ genre, seen_count, posterUrls: byGenrePosters.get(genre) || [] }));

  // Decade suggestions (ready >=12, almost 7-11)
  const decadeCandidates = [...byDecade.entries()]
    .filter(([start, c]) => c >= 12 && !savedDecades.has(`${start}s`) && !dismissedDecades.has(`${start}s`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const decadeAlmost = [...byDecade.entries()]
    .filter(([start, c]) => c >= 7 && c < 12 && !savedDecades.has(`${start}s`) && !dismissedDecades.has(`${start}s`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([start, seen_count]) => ({ decade: `${start}s`, startYear: start, seen_count, posterUrls: byDecadePosters.get(start) || [] }));

  const genreSuggestions: GenreSuggestion[] = [];
  for (const [genre, seen_count] of genreCandidates) {
    const { data: items } = await supabase
      .from('rankings')
      .select('ranking, seen_it, movie:movies(id, title, poster_url, release_year, genres)')
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
          id: m.id as string,
          title: m.title as string,
          release_year: (m.release_year as number | null) ?? null,
          poster_url: (m.poster_url as string | null),
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
      .select('ranking, seen_it, movie:movies(id, title, poster_url, release_year)')
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
          id: m.id as string,
          title: m.title as string,
          release_year: (m.release_year as number | null) ?? null,
          poster_url: (m.poster_url as string | null),
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
    .map(([director, seen_count]) => ({ director, seen_count, posterUrls: byDirectorPosters.get(director) || [] }));

  // Actor suggestions
  const actorCandidates = [...byActor.entries()]
    .filter(([actor, c]) => c >= 10 && !savedActors.has(actor) && !dismissedActors.has(actor))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const actorAlmost = [...byActor.entries()]
    .filter(([actor, c]) => c >= 6 && c < 10 && !savedActors.has(actor) && !dismissedActors.has(actor))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([actor, seen_count]) => ({ actor, seen_count, posterUrls: byActorPosters.get(actor) || [] }));

  const actorSuggestions: ActorSuggestion[] = [];
  for (const [actor, seen_count] of actorCandidates) {
    // Fetch this user's movies where cast_list includes actor
    const { data: items } = await supabase
      .from('rankings')
      .select('ranking, seen_it, movie:movies(id, title, poster_url, release_year, cast_list)')
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
          id: m.id as string,
          title: m.title as string,
          release_year: (m.release_year as number | null) ?? null,
          poster_url: (m.poster_url as string | null),
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
      .select('ranking, seen_it, movie:movies(id, title, poster_url, release_year, director)')
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
          id: m.id as string,
          title: m.title as string,
          release_year: (m.release_year as number) ?? null,
          poster_url: (m.poster_url as string | null),
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

export default async function ReadyMadeListsPage() {
  const { user, suggestions, almost, actorSuggestions, actorAlmost, genreSuggestions, genreAlmost, decadeSuggestions, decadeAlmost } = await getSuggestions();
  const isPremium = user ? await isPremiumUser(await createSupabaseServerClient(), user.id) : false;

  const hasAny =
    suggestions.length + actorSuggestions.length + genreSuggestions.length + decadeSuggestions.length +
    almost.length + actorAlmost.length + genreAlmost.length + decadeAlmost.length > 0;

  // Ready and Almost Ready suggestions share one carousel and one card
  // shell (ReadyMadeCard) — sorting each category by seen-count naturally
  // puts the ready ones first, since they always clear a higher bar than
  // the almost-ready ones sharing that same category.
  const slides: ReadyMadeSlide[] = [
    ...suggestions.map((s) => ({ key: `director-${s.director}`, category: 'directors' as const, ...buildDirectorSuggestion(s, isPremium) })),
    ...almost.map((a) => ({ key: `director-almost-${a.director}`, category: 'directors' as const, ...buildAlmostDirector(a) })),
    ...actorSuggestions.map((a) => ({ key: `actor-${a.actor}`, category: 'actors' as const, ...buildActorSuggestion(a, isPremium) })),
    ...actorAlmost.map((a) => ({ key: `actor-almost-${a.actor}`, category: 'actors' as const, ...buildAlmostActor(a) })),
    ...genreSuggestions.map((g) => ({ key: `genre-${g.genre}`, category: 'genres' as const, ...buildGenreSuggestion(g, isPremium) })),
    ...genreAlmost.map((g) => ({ key: `genre-almost-${g.genre}`, category: 'genres' as const, ...buildAlmostGenre(g) })),
    ...decadeSuggestions.map((d) => ({ key: `decade-${d.decade}`, category: 'decades' as const, ...buildDecadeSuggestion(d, isPremium) })),
    ...decadeAlmost.map((d) => ({ key: `decade-almost-${d.decade}`, category: 'decades' as const, ...buildAlmostDecade(d) })),
  ];

  return (
    // Same explicit viewport-based height as the Lists home page (src/app/lists/home.tsx)
    // so the carousel below gets the same available space, and its cards render at the
    // same on-screen size — previously this page used a fixed h-[65vh] instead, which
    // made its cards visibly smaller/shorter than the Lists carousel's on most screens.
    <div
      className="max-w-screen-xl flex flex-col min-h-0"
      style={{ height: "calc(100dvh - var(--header-height, calc(5rem + env(safe-area-inset-top))) - (6rem + env(safe-area-inset-bottom)))" }}
    >
      <h1 className="flex-shrink-0 mb-6 text-2xl sm:text-3xl font-unbounded uppercase tracking-wide text-white">Ready‑Made Lists</h1>

      {!user ? (
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <h2 className="mb-2 text-xl font-bold text-white tracking-wide">Sign in to see your lists</h2>
          <p className="text-gray-300">Mark at least 10 movies by a director as seen and we'll generate one automatically.</p>
          <Link href="/login" className="inline-block px-4 py-2 mt-4 rounded-full text-black bg-gold-500 hover:bg-gold-400 transition-colors font-medium">Sign In</Link>
        </div>
      ) : !hasAny ? (
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <p className="text-gray-300">No Ready‑Made lists yet. Watch and mark at least 6 movies by a director to see one taking shape.</p>
          <Link href="/lists" className="inline-block mt-4 text-gold-400 hover:underline">Go to your lists</Link>
        </div>
      ) : (
        <ReadyMadeCarousel slides={slides} />
      )}
    </div>
  );
}

// Movie count isn't part of the name — it's already shown separately
// wherever the list is displayed (e.g. "10 movies" under the title), so
// baking it into the name too was pure redundancy.
function formatListName(director: string, _count: number) {
  return director;
}
function formatActorListName(actor: string, _count: number) {
  return `Actor - ${actor}`;
}
function formatGenreListName(genre: string, _count: number) {
  return `Genre - ${genre}`;
}
function formatDecadeListName(decade: string, _count: number) {
  return `Decade - ${decade}`;
}

async function saveList(formData: FormData) {
  'use server';
  const director = String(formData.get('director') || '');
  const count = Number(formData.get('count') || 0);
  let ids = String(formData.get('movie_ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  if (!(await isPremiumUser(supabase, user.id))) {
    redirect('/premium');
  }

  // Fallback: if no ids were posted, rebuild from server-side query
  if (ids.length === 0 && director) {
    // 1) Get all movie ids by this director
    const { data: movieRows } = await supabase
      .from('movies')
      .select('id')
      .eq('director', director);
    const movieIds = (movieRows || []).map((m) => m.id as string);
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
            .map((r) => r.movie_id as string)
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
    .map((s) => s.trim())
    .filter(Boolean);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await isPremiumUser(supabase, user.id))) redirect('/premium');
  // Fallback derive actor movie IDs
  if (ids.length === 0 && actor) {
    const { data: movieRows } = await supabase.from('movies').select('id, cast_list');
    const candidateIds = (movieRows || []).filter((m: any) => Array.isArray(m.cast_list) && m.cast_list.includes(actor)).map((m: any) => m.id as string);
    if (candidateIds.length) {
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', candidateIds);
      ids = Array.from(new Set((rankRows || []).sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0))).map((r) => r.movie_id as string)));
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
    .map((s) => s.trim())
    .filter(Boolean);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await isPremiumUser(supabase, user.id))) redirect('/premium');
  if (ids.length === 0 && genre) {
    const { data: movieRows } = await supabase.from('movies').select('id, genres');
    const candidateIds = (movieRows || []).filter((m: any) => Array.isArray(m.genres) && m.genres.includes(genre)).map((m: any) => m.id as string);
    if (candidateIds.length) {
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', candidateIds);
      const rows = (rankRows || []);
      const filtered = totalSeen > 100 ? rows.filter((r) => (r.ranking ?? 0) >= 9) : rows;
      ids = Array.from(new Set(filtered.sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0))).map((r) => r.movie_id as string)));
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
    .map((s) => s.trim())
    .filter(Boolean);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await isPremiumUser(supabase, user.id))) redirect('/premium');
  if (ids.length === 0 && startYear) {
    const { data: movieRows } = await supabase
      .from('movies')
      .select('id, release_year');
    const candidateIds = (movieRows || [])
      .filter((m: any) => typeof m.release_year === 'number' && m.release_year >= startYear && m.release_year < startYear + 10)
      .map((m: any) => m.id as string);
    if (candidateIds.length) {
      const { data: rankRows } = await supabase
        .from('rankings')
        .select('movie_id, ranking')
        .eq('user_id', user.id)
        .eq('seen_it', true)
        .in('movie_id', candidateIds);
      const rows = (rankRows || []);
      const filtered = totalSeen > 100 ? rows.filter((r) => (r.ranking ?? 0) >= 9) : rows;
      ids = Array.from(new Set(filtered.sort((a, b) => ((b.ranking ?? 0) - (a.ranking ?? 0))).map((r) => r.movie_id as string)));
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

function PremiumLockBadge() {
  return (
    <Link
      href="/premium"
      className="flex items-center justify-center gap-1.5 w-full h-11 rounded-full text-sm font-medium text-gray-300 bg-white/5 border border-white/10 backdrop-blur-sm hover:text-white hover:bg-white/10 transition-colors"
      title="Saving Ready-Made lists is a premium feature"
    >
      <Lock className="w-3.5 h-3.5" />
      Unlock with Premium
    </Link>
  );
}

// Each builder below returns both the compact carousel card (`node`) and its
// full-screen counterpart (`detailNode`, shown in ReadyMadeExpandOverlay when
// the card is tapped) — sharing one `primaryAction`/`dismissForm`/`meta`
// computation so the Save/Dismiss/progress behavior is identical wherever it
// renders, instead of duplicating that logic per surface.
function buildDirectorSuggestion(suggestion: DirectorSuggestion, isPremium: boolean) {
  const ids = suggestion.movies.map((m) => m.id).join(',');
  const posterUrls = suggestion.movies
    .map((m) => m.poster_url)
    .filter((u): u is string => !!u)
    .slice(0, 5);
  const href = `/lists/ready-made/${slugifyTitle(suggestion.director)}`;
  const primaryAction = isPremium ? (
    <SaveButton action={saveList} hidden={{ director: suggestion.director, count: suggestion.seen_count, movie_ids: ids }} />
  ) : (
    <PremiumLockBadge />
  );
  const dismissForm = <DismissButton action={dismissSuggestion} fieldName="director" value={suggestion.director} />;
  return {
    node: (
      <ReadyMadeCard
        title={suggestion.director}
        count={suggestion.seen_count}
        posterUrls={posterUrls}
        subtitle={<span>Director</span>}
        ready
        primaryAction={primaryAction}
        viewHref={href}
        dismissForm={dismissForm}
      />
    ),
    detailNode: (
      <ReadyMadeSuggestionDetail
        category="Director"
        title={suggestion.director}
        count={suggestion.seen_count}
        movies={suggestion.movies}
        primaryAction={primaryAction}
        dismissForm={dismissForm}
      />
    ),
  };
}

function buildActorSuggestion(suggestion: ActorSuggestion, isPremium: boolean) {
  const ids = suggestion.movies.map((m) => m.id).join(',');
  const posterUrls = suggestion.movies
    .map((m) => m.poster_url)
    .filter((u): u is string => !!u)
    .slice(0, 5);
  const href = `/lists/ready-made/${slugifyTitle(suggestion.actor)}`;
  const primaryAction = isPremium ? (
    <SaveButton action={saveActorList} hidden={{ actor: suggestion.actor, count: suggestion.seen_count, movie_ids: ids }} />
  ) : (
    <PremiumLockBadge />
  );
  const dismissForm = <DismissButton action={dismissActorSuggestion} fieldName="actor" value={suggestion.actor} />;
  return {
    node: (
      <ReadyMadeCard
        title={suggestion.actor}
        count={suggestion.seen_count}
        posterUrls={posterUrls}
        subtitle={<span>Actor</span>}
        ready
        primaryAction={primaryAction}
        viewHref={href}
        dismissForm={dismissForm}
      />
    ),
    detailNode: (
      <ReadyMadeSuggestionDetail
        category="Actor"
        title={suggestion.actor}
        count={suggestion.seen_count}
        movies={suggestion.movies}
        primaryAction={primaryAction}
        dismissForm={dismissForm}
      />
    ),
  };
}

function buildGenreSuggestion(suggestion: GenreSuggestion, isPremium: boolean) {
  const totalSeen = suggestion.seen_count;
  const filteredCount = suggestion.movies.length;
  const ids = suggestion.movies.map((m) => m.id).join(',');
  const posterUrls = suggestion.movies
    .map((m) => m.poster_url)
    .filter((u): u is string => !!u)
    .slice(0, 5);
  const href = `/lists/ready-made/${slugifyTitle(suggestion.genre)}`;
  const meta = totalSeen > 100 && (
    <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
      <RatingChip rating={9} />
      <RatingChip rating={10} />
      <span>only</span>
    </div>
  );
  const primaryAction = isPremium ? (
    <SaveButton action={saveGenreList} hidden={{ genre: suggestion.genre, count: filteredCount, total_seen: totalSeen, movie_ids: ids }} />
  ) : (
    <PremiumLockBadge />
  );
  const dismissForm = <DismissButton action={dismissGenreSuggestion} fieldName="genre" value={suggestion.genre} />;
  return {
    node: (
      <ReadyMadeCard
        title={suggestion.genre}
        count={filteredCount}
        asterisk={totalSeen > 100}
        posterUrls={posterUrls}
        subtitle={<span>Genre</span>}
        ready
        meta={meta}
        primaryAction={primaryAction}
        viewHref={href}
        dismissForm={dismissForm}
      />
    ),
    detailNode: (
      <ReadyMadeSuggestionDetail
        category="Genre"
        title={suggestion.genre}
        count={filteredCount}
        asterisk={totalSeen > 100}
        meta={meta}
        movies={suggestion.movies}
        primaryAction={primaryAction}
        dismissForm={dismissForm}
      />
    ),
  };
}

function buildDecadeSuggestion(suggestion: DecadeSuggestion, isPremium: boolean) {
  const totalSeen = suggestion.seen_count;
  const filteredCount = suggestion.movies.length;
  const ids = suggestion.movies.map((m) => m.id).join(',');
  const posterUrls = suggestion.movies
    .map((m) => m.poster_url)
    .filter((u): u is string => !!u)
    .slice(0, 5);
  const href = `/lists/ready-made/${slugifyTitle(suggestion.decade)}`;
  const meta = totalSeen > 100 && (
    <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
      <RatingChip rating={9} />
      <RatingChip rating={10} />
      <span>only</span>
    </div>
  );
  const primaryAction = isPremium ? (
    <SaveButton
      action={saveDecadeList}
      hidden={{
        decade: suggestion.decade,
        start_year: suggestion.startYear,
        count: filteredCount,
        total_seen: totalSeen,
        movie_ids: ids,
      }}
    />
  ) : (
    <PremiumLockBadge />
  );
  const dismissForm = <DismissButton action={dismissDecadeSuggestion} fieldName="decade" value={suggestion.decade} />;
  return {
    node: (
      <ReadyMadeCard
        title={suggestion.decade}
        count={filteredCount}
        asterisk={totalSeen > 100}
        posterUrls={posterUrls}
        subtitle={<span>Decade</span>}
        ready
        meta={meta}
        primaryAction={primaryAction}
        viewHref={href}
        dismissForm={dismissForm}
      />
    ),
    detailNode: (
      <ReadyMadeSuggestionDetail
        category="Decade"
        title={suggestion.decade}
        count={filteredCount}
        asterisk={totalSeen > 100}
        meta={meta}
        movies={suggestion.movies}
        primaryAction={primaryAction}
        dismissForm={dismissForm}
      />
    ),
  };
}

// Almost-ready suggestions — same shells as the ready-to-save versions above
// (fan of posters, View, Dismiss), swapping only the "seen" pill for a
// progress viz (AlmostProgressMeta) and the Save button for a locked "X more
// to unlock" bar (AlmostLockedPill). Not premium-gated: there's nothing to
// save yet either way. No full movie data is computed for these (only
// poster thumbnails), so the detail view falls back to a poster grid.
function buildAlmostDirector(suggestion: AlmostDirector) {
  const meta = <AlmostProgressMeta seenCount={suggestion.seen_count} threshold={10} />;
  const primaryAction = <AlmostLockedPill seenCount={suggestion.seen_count} threshold={10} />;
  const dismissForm = <DismissButton action={dismissSuggestion} fieldName="director" value={suggestion.director} />;
  return {
    node: (
      <ReadyMadeCard
        title={suggestion.director}
        count={suggestion.seen_count}
        posterUrls={suggestion.posterUrls}
        subtitle={<span>Director</span>}
        meta={meta}
        primaryAction={primaryAction}
        viewHref={`/lists/ready-made/${slugifyTitle(suggestion.director)}`}
        dismissForm={dismissForm}
      />
    ),
    detailNode: (
      <ReadyMadeSuggestionDetail
        category="Director"
        title={suggestion.director}
        count={suggestion.seen_count}
        meta={meta}
        posterUrls={suggestion.posterUrls}
        primaryAction={primaryAction}
        dismissForm={dismissForm}
      />
    ),
  };
}

function buildAlmostActor(suggestion: AlmostActor) {
  const meta = <AlmostProgressMeta seenCount={suggestion.seen_count} threshold={10} />;
  const primaryAction = <AlmostLockedPill seenCount={suggestion.seen_count} threshold={10} />;
  const dismissForm = <DismissButton action={dismissActorSuggestion} fieldName="actor" value={suggestion.actor} />;
  return {
    node: (
      <ReadyMadeCard
        title={suggestion.actor}
        count={suggestion.seen_count}
        posterUrls={suggestion.posterUrls}
        subtitle={<span>Actor</span>}
        meta={meta}
        primaryAction={primaryAction}
        viewHref={`/lists/ready-made/${slugifyTitle(suggestion.actor)}`}
        dismissForm={dismissForm}
      />
    ),
    detailNode: (
      <ReadyMadeSuggestionDetail
        category="Actor"
        title={suggestion.actor}
        count={suggestion.seen_count}
        meta={meta}
        posterUrls={suggestion.posterUrls}
        primaryAction={primaryAction}
        dismissForm={dismissForm}
      />
    ),
  };
}

function buildAlmostGenre(suggestion: AlmostGenre) {
  const meta = <AlmostProgressMeta seenCount={suggestion.seen_count} threshold={10} />;
  const primaryAction = <AlmostLockedPill seenCount={suggestion.seen_count} threshold={10} />;
  const dismissForm = <DismissButton action={dismissGenreSuggestion} fieldName="genre" value={suggestion.genre} />;
  return {
    node: (
      <ReadyMadeCard
        title={suggestion.genre}
        count={suggestion.seen_count}
        posterUrls={suggestion.posterUrls}
        subtitle={<span>Genre</span>}
        meta={meta}
        primaryAction={primaryAction}
        viewHref={`/lists/ready-made/${slugifyTitle(suggestion.genre)}`}
        dismissForm={dismissForm}
      />
    ),
    detailNode: (
      <ReadyMadeSuggestionDetail
        category="Genre"
        title={suggestion.genre}
        count={suggestion.seen_count}
        meta={meta}
        posterUrls={suggestion.posterUrls}
        primaryAction={primaryAction}
        dismissForm={dismissForm}
      />
    ),
  };
}

function buildAlmostDecade(suggestion: AlmostDecade) {
  const meta = <AlmostProgressMeta seenCount={suggestion.seen_count} threshold={12} />;
  const primaryAction = <AlmostLockedPill seenCount={suggestion.seen_count} threshold={12} />;
  const dismissForm = <DismissButton action={dismissDecadeSuggestion} fieldName="decade" value={suggestion.decade} />;
  return {
    node: (
      <ReadyMadeCard
        title={suggestion.decade}
        count={suggestion.seen_count}
        posterUrls={suggestion.posterUrls}
        subtitle={<span>Decade</span>}
        meta={meta}
        primaryAction={primaryAction}
        viewHref={`/lists/ready-made/${slugifyTitle(suggestion.decade)}`}
        dismissForm={dismissForm}
      />
    ),
    detailNode: (
      <ReadyMadeSuggestionDetail
        category="Decade"
        title={suggestion.decade}
        count={suggestion.seen_count}
        meta={meta}
        posterUrls={suggestion.posterUrls}
        primaryAction={primaryAction}
        dismissForm={dismissForm}
      />
    ),
  };
}

