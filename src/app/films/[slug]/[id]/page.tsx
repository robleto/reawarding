import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { slugifyTitle } from "@/utils/slug";
import Image from "next/image";
import { normalizeImageUrl } from "@/utils/imageUrl";
import FilmActions from "@/components/films/FilmActions";
import VideoPlayer from "@/components/films/VideoPlayer";
import BackdropGallery from "@/components/films/BackdropGallery";
import KeywordTags from "@/components/films/KeywordTags";
import WatchProviders from "@/components/films/WatchProviders";
import AlternativeTitles from "@/components/films/AlternativeTitles";
import SimilarMoviesGrid from "@/components/films/SimilarMoviesGrid";
import EnhancedStats from "@/components/films/EnhancedStats";
import ImdbIdEditor from "@/components/films/ImdbIdEditor";
import FilmEntryPanel from "@/components/films/FilmEntryPanel";
import {
  ExternalLink, Star, TrendingUp, DollarSign, Users, Calendar, Clock,
  Film as FilmIcon, Award, Video, Image as ImageIcon, BarChart3,
  ThumbsUp, Play, Camera
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

export default async function MovieDetailPage({ params }: any) {
  const { slug, id } = params;

  const { data: movie, error } = await supabaseAdmin
    .from("movies")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !movie) return notFound();

  // Ensure canonical slug in URL
  const canonicalSlug = slugifyTitle(movie.title || "movie");
  if (canonicalSlug !== slug) {
    redirect(`/films/${canonicalSlug}/${movie.id}`);
  }

  const poster = normalizeImageUrl(movie.cached_poster_url || movie.poster_url);
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  const isGuest = !user;

  // Parse JSONB fields if they're strings (Supabase sometimes returns JSONB as strings)
  const videos = typeof movie.videos === "string" ? JSON.parse(movie.videos) : movie.videos;
  const images = typeof movie.images === "string" ? JSON.parse(movie.images) : movie.images;
  const keywords = movie.keywords; // Arrays are already parsed
  const watchProviders = typeof movie.watch_providers === "string" ? JSON.parse(movie.watch_providers) : movie.watch_providers;
  const altTitles = typeof movie.alternative_titles === "string" ? JSON.parse(movie.alternative_titles) : movie.alternative_titles;

  type SimilarMovie = {
    id: number;
    title: string;
    cached_thumb_url?: string | null;
    thumb_url?: string | null;
    poster_url?: string | null;
    release_year?: number | null;
    similarity_score?: number | null;
  };

  // Fetch similar movies using content-based filtering (non-blocking - don't fail if slow)
  let similarMovies: SimilarMovie[] = [];
  try {
    const result = await Promise.race([
      supabaseAdmin.rpc("get_similar_movies", {
        target_movie_id: id,
        limit_count: 12,
      }),
      new Promise<{ data: SimilarMovie[] | null; error: null }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: null }), 2000)
      ),
    ]);

    if (result.data && Array.isArray(result.data)) {
      similarMovies = result.data;
    }
  } catch (error) {
    console.error("Similar movies error:", error);
  }

  // Peer movies for FilmEntryPanel — top acclaimed films from the same year (logged-out only)
  // Non-blocking: failures silently produce an empty array so the page still renders.
  type PeerMovie = { id: number; title: string; cached_poster_url?: string | null; poster_url?: string | null };
  let peerMovies: PeerMovie[] = [];
  if (isGuest && movie.release_year) {
    try {
      const { data: peerData } = await supabaseAdmin
        .from("movies")
        .select("id, title, cached_poster_url, poster_url")
        .eq("release_year", movie.release_year)
        .neq("id", movie.id)
        .gte("tmdb_rating", 6.5)
        .order("vote_count", { ascending: false, nullsFirst: false })
        .limit(5);
      if (peerData) peerMovies = peerData as PeerMovie[];
    } catch {
      // Non-critical — panel renders without thumbnails if this fails
    }
  }

  // Community stats (server-side) – simple aggregation from rankings
  let communityStats: { totalRatings: number; avgRating: number | null; seenCount: number; watchlists: number; listsTotal: number; histogram: number[] } = {
    totalRatings: 0,
    avgRating: null,
    seenCount: 0,
    watchlists: 0,
    listsTotal: 0,
    histogram: Array.from({ length: 10 }, () => 0),
  };
  try {
    const attemptIds: any[] = [];
    const asNumber = typeof movie.id === 'number' ? movie.id : Number(movie.id);
    if (!Number.isNaN(asNumber)) attemptIds.push(asNumber);
    attemptIds.push(movie.id as any);

    // Try queries with numeric first (if valid), then fallback to raw id
    let totalRatings = 0;
    let seen = 0;
    let ratingsRows: { ranking: number }[] = [];
    let watchlists = 0;
    let listsTotal = 0;

    // Find IDs of default Watchlist lists via list_type flag (authoritative)
    const watchlistListsRes = await supabaseAdmin
      .from("movie_lists")
      .select("id")
      .eq("list_type", "watchlist");
    const watchlistListIds: string[] = (watchlistListsRes.data ?? []).map((r: any) => r.id);

    for (const movieId of attemptIds) {
      const ratingsCountRes = await supabaseAdmin
        .from("rankings")
        .select("*", { count: "exact", head: true })
        .eq("movie_id", movieId)
        .not("ranking", "is", null);
      const seenRes = await supabaseAdmin
        .from("rankings")
        .select("*", { count: "exact", head: true })
        .eq("movie_id", movieId)
        .eq("seen_it", true);
      const ratingsRes = await supabaseAdmin
        .from("rankings")
        .select("ranking")
        .eq("movie_id", movieId)
        .not("ranking", "is", null);

      const listsTotalRes = await supabaseAdmin
        .from("movie_list_items")
        .select("*", { count: "exact", head: true })
        .eq("movie_id", movieId);
      let watchRes = { count: 0 } as { count: number | null };
      if (watchlistListIds.length > 0) {
        watchRes = await supabaseAdmin
          .from("movie_list_items")
          .select("*", { count: "exact", head: true })
          .eq("movie_id", movieId)
          .in("list_id", watchlistListIds);
      }

      if ((ratingsCountRes.count ?? 0) > 0 || (seenRes.count ?? 0) > 0 || (ratingsRes.data?.length ?? 0) > 0 || (listsTotalRes.count ?? 0) > 0) {
        totalRatings = ratingsCountRes.count ?? 0;
        seen = seenRes.count ?? 0;
        ratingsRows = (ratingsRes.data as any) || [];
        listsTotal = listsTotalRes.count ?? 0;
        watchlists = watchRes.count ?? 0;
        break;
      }
    }

    let avg: number | null = null;
    if (ratingsRows.length > 0) {
      const sum = ratingsRows.reduce((acc: number, row: any) => acc + (row.ranking as number), 0);
      avg = sum / ratingsRows.length;
    }
    const histogram = Array.from({ length: 10 }, () => 0);
    for (const row of ratingsRows) {
      const v = Number(row.ranking);
      if (Number.isFinite(v) && v >= 1 && v <= 10) histogram[v - 1] += 1;
    }
    communityStats = { totalRatings, avgRating: avg, seenCount: seen, watchlists, listsTotal, histogram };
  } catch (e) {
    console.warn("Community stats load failed:", e);
  }

  // Fetch awards data from Awards API (if configured and movie has imdb_id)
  let awardsData: { badges?: string[]; nominations?: any[]; stats?: { nominations: number; wins: number } } | null = null;
  if (movie.imdb_id && process.env.AWARDS_API_BASE_URL && process.env.AWARDS_API_KEY) {
    try {
      const awardsRes = await fetch(
        `${process.env.AWARDS_API_BASE_URL}/film-awards?imdb_id=${movie.imdb_id}`,
        { 
          headers: { 'x-api-key': process.env.AWARDS_API_KEY },
          next: { revalidate: 3600 } // Cache for 1 hour
        }
      );
      if (awardsRes.ok) {
        awardsData = await awardsRes.json();
      }
    } catch (e) {
      console.warn('Awards API fetch failed:', e);
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      {isGuest && movie.release_year && (
        <FilmEntryPanel
          film={{ id: movie.id, title: movie.title }}
          year={movie.release_year}
          peerMovies={peerMovies}
        />
      )}
      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] lg:grid-cols-[350px,1fr] gap-6 lg:gap-8 mb-8">
        {/* Poster */}
        <div className="rounded-xl overflow-hidden border border-yellow-500/20 bg-gray-900/60 shadow-2xl max-w-xl md:max-w-none mx-auto md:mx-0 w-full">
          <div className="relative aspect-[2/3]">
            {poster ? (
              <Image src={poster} alt={movie.title} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <FilmIcon className="w-24 h-24 text-gray-600" />
              </div>
            )}
          </div>
        </div>

        {/* Main Info */}
        <div className="flex flex-col">
          <div className="flex-grow">
            <h1 className="text-4xl lg:text-5xl font-unbounded font-bold text-yellow-400 mb-2">
              {movie.title}
            </h1>
            
            {movie.tagline && (
              <p className="text-lg text-gray-400 italic mb-4">&ldquo;{movie.tagline}&rdquo;</p>
            )}

            {/* Action Buttons */}
            <div className="mb-6">
              <FilmActions movieId={movie.id} />
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="px-4 py-2 rounded-lg bg-gray-800/60 border border-yellow-500/10 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <span className="font-semibold">{movie.release_year}</span>
              </div>
              
              {movie.runtime && (
                <div className="px-4 py-2 rounded-lg bg-gray-800/60 border border-yellow-500/10 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span>{movie.runtime} min</span>
                </div>
              )}
              
              {movie.mpaa_rating && (
                <div className="px-4 py-2 rounded-lg bg-gray-800/60 border border-yellow-500/10">
                  <span className="font-semibold">Rated {movie.mpaa_rating}</span>
                </div>
              )}

              {movie.imdb_rating && (
                <div className="px-4 py-2 rounded-lg bg-gray-800/60 border border-yellow-500/10 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{movie.imdb_rating.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">IMDB</span>
                </div>
              )}

              {movie.metacritic_score && (
                <div className="px-4 py-2 rounded-lg bg-gray-800/60 border border-yellow-500/10 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="font-semibold">{movie.metacritic_score}</span>
                  <span className="text-gray-500 text-sm">Metacritic</span>
                </div>
              )}
            </div>

            {/* Enhanced Stats */}
            <EnhancedStats
              popularity={movie.popularity}
              voteCount={movie.vote_count}
              status={movie.status}
              originalLanguage={movie.original_language}
              originalTitle={movie.original_title}
              title={movie.title}
              releaseDate={movie.release_date}
            />

            {/* Overview */}
            {movie.overview && (
              <div className="mb-6 mt-6">
                <h2 className="text-xl font-unbounded font-semibold text-yellow-400 mb-3">Overview</h2>
                <p className="text-gray-200 leading-relaxed text-lg">{movie.overview}</p>
              </div>
            )}

            {/* Genres */}
            {Array.isArray(movie.genres) && movie.genres.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-2">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((g: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-full text-sm bg-yellow-900/40 text-yellow-300 border border-yellow-500/20">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Information Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cast & Crew */}
        <div className="space-y-6">
          {/* Director */}
          {movie.director && (
            <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
              <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-2">Director</h3>
              <p className="text-gray-200">{movie.director}</p>
            </div>
          )}

          {/* Writer */}
          {movie.writer && (
            <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
              <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-2">Writer</h3>
              <p className="text-gray-200">{movie.writer}</p>
            </div>
          )}

          {/* Cast */}
          {Array.isArray(movie.cast_list) && movie.cast_list.length > 0 && (
            <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
              <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Cast
              </h3>
              <div className="flex flex-wrap gap-2">
                {movie.cast_list.map((actor: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-md text-sm bg-gray-800/60 text-gray-200">
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TODO: Add cast - coming from TMDB */}
          {(!movie.cast_list || movie.cast_list.length === 0) && (
            <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10 opacity-50">
              <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Cast
              </h3>
              <p className="text-gray-500 text-sm italic">Coming soon from TMDB</p>
            </div>
          )}

          {/* Community Stats moved to right column */}
        </div>

        {/* Production & Financial (right column) */}
        <div className="space-y-6">
          {/* Community Stats (right flanking director/cast) */}
          <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
            <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-3">Community Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Ratings</span>
                <span className="text-gray-200 font-semibold">{communityStats.totalRatings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Average Rating</span>
                <span className="text-gray-200 font-semibold">{communityStats.avgRating !== null ? communityStats.avgRating.toFixed(1) : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Seen It</span>
                <span className="text-gray-200 font-semibold">{communityStats.seenCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">On Watchlist</span>
                <span className="text-gray-200 font-semibold">{communityStats.watchlists}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">On Lists</span>
                <span className="text-gray-200 font-semibold">{communityStats.listsTotal}</span>
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-400 mb-1">Rating Distribution</div>
                <div className="grid grid-cols-10 gap-1 items-end h-16">
                  {communityStats.histogram.map((count, i) => {
                    const max = Math.max(1, ...communityStats.histogram);
                    const h = Math.round((count / max) * 100);
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-2 sm:w-3 bg-yellow-500/70" style={{ height: `${h}%` }} />
                        <div className="text-[10px] text-gray-500 mt-1">{i + 1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* Production Companies */}
          {Array.isArray(movie.production_companies) && movie.production_companies.length > 0 && (
            <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
              <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-3">Production Companies</h3>
              <div className="space-y-1">
                {movie.production_companies.map((company: string, i: number) => (
                  <div key={i} className="text-gray-200">{company}</div>
                ))}
              </div>
            </div>
          )}

          {/* Production Countries */}
          {Array.isArray(movie.production_countries) && movie.production_countries.length > 0 && (
            <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
              <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-2">Production Countries</h3>
              <div className="flex flex-wrap gap-2">
                {movie.production_countries.map((country: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-md text-sm bg-gray-800/60 text-gray-200">
                    {country}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {Array.isArray(movie.spoken_languages) && movie.spoken_languages.length > 0 && (
            <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
              <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-2">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {movie.spoken_languages.map((lang: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-md text-sm bg-gray-800/60 text-gray-200">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Budget & Revenue */}
          {(movie.budget || movie.revenue) && (
            <div className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
              <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Box Office
              </h3>
              <div className="space-y-2">
                {movie.budget && movie.budget > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Budget:</span>
                    <span className="text-gray-200 font-semibold">{formatCurrency(movie.budget)}</span>
                  </div>
                )}
                {movie.revenue && movie.revenue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Revenue:</span>
                    <span className="text-gray-200 font-semibold">{formatCurrency(movie.revenue)}</span>
                  </div>
                )}
                {movie.budget && movie.revenue && movie.budget > 0 && movie.revenue > 0 && (
                  <div className="flex justify-between pt-2 border-t border-gray-700">
                    <span className="text-gray-400">Profit:</span>
                    <span className={`font-semibold ${movie.revenue - movie.budget >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(movie.revenue - movie.budget)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alternative Titles (AKA) */}
          {Array.isArray(altTitles) && altTitles.length > 0 && (
            <AlternativeTitles titles={altTitles} />
          )}
        </div>
      </div>

      {/* Additional Metadata & IDs moved to bottom */}

      {/* Videos Section */}
      {videos && Array.isArray(videos) && videos.length > 0 && (
        <div className="mt-8 p-6 rounded-lg bg-gray-900/40 border border-yellow-500/10">
          <div className="flex items-center gap-3 mb-4">
            <Video className="w-6 h-6 text-yellow-400" />
            <h3 className="text-lg font-unbounded font-semibold text-yellow-400">
              Trailers & Videos
            </h3>
            <span className="text-sm text-gray-400">({videos.length})</span>
          </div>
          <VideoPlayer videos={videos} />
        </div>
      )}

      {/* Backdrops Gallery */}
      {images?.backdrops && Array.isArray(images.backdrops) && images.backdrops.length > 0 && (
        <div className="mt-8 p-6 rounded-lg bg-gray-900/40 border border-yellow-500/10">
          <div className="flex items-center gap-3 mb-4">
            <ImageIcon className="w-6 h-6 text-yellow-400" />
            <h3 className="text-lg font-unbounded font-semibold text-yellow-400">
              Backdrops & Images
            </h3>
            <span className="text-sm text-gray-400">({images.backdrops.length})</span>
          </div>
          <BackdropGallery images={images.backdrops} />
        </div>
      )}

      {/* Keywords */}
      {keywords && Array.isArray(keywords) && keywords.length > 0 && (
        <div className="mt-8 p-6 rounded-lg bg-gray-900/40 border border-yellow-500/10">
          <KeywordTags keywords={keywords} />
        </div>
      )}

      {/* Awards & Recognition */}
      <div className="mt-8 p-6 rounded-lg bg-gray-900/40 border border-yellow-500/10">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-unbounded font-semibold text-yellow-400">Awards & Nominations</h3>
        </div>
        {awardsData && (awardsData.badges?.length || awardsData.nominations?.length) ? (
          <div className="space-y-4">
            {/* Badges */}
            {awardsData.badges && awardsData.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {awardsData.badges.map((badge, i) => (
                  <span key={i} className="px-4 py-2 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-500/30 font-semibold text-sm">
                    🏆 {badge}
                  </span>
                ))}
              </div>
            )}
            {/* Stats */}
            {awardsData.stats && (awardsData.stats.nominations > 0 || awardsData.stats.wins > 0) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-gray-800/60 border border-yellow-500/10">
                  <div className="text-2xl font-bold text-yellow-400">{awardsData.stats.wins}</div>
                  <div className="text-sm text-gray-400">Oscar Wins</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/60 border border-yellow-500/10">
                  <div className="text-2xl font-bold text-yellow-400">{awardsData.stats.nominations}</div>
                  <div className="text-sm text-gray-400">Nominations</div>
                </div>
              </div>
            )}
            {/* Nominations List */}
            {awardsData.nominations && awardsData.nominations.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-400 mb-2">Nominations by Category:</div>
                {awardsData.nominations.slice(0, 10).map((nom: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-800/40 border border-yellow-500/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-200">
                          {nom.category_name || nom.category_slug}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {nom.ceremony_year} {nom.ceremony_short_name || 'Academy Awards'}
                        </div>
                        {nom.people && Array.isArray(nom.people) && nom.people.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {nom.people.map((p: any) => p.name).join(', ')}
                          </div>
                        )}
                      </div>
                      {nom.is_winner && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-900/60 text-yellow-300 border border-yellow-500/30">
                          WINNER
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {awardsData.nominations.length > 10 && (
                  <div className="text-xs text-gray-500 text-center pt-2">
                    + {awardsData.nominations.length - 10} more nominations
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 text-sm italic">
            {movie.imdb_id 
              ? 'No Oscar nominations or wins recorded for this film'
              : 'Awards data requires IMDB ID (coming soon via TMDB enrichment)'}
          </div>
        )}
      </div>

      {/* User Stats & Community (removed for now; community stats moved to left column) */}

      {/* Similar Movies / Recommendations */}
      <div className="mt-8 p-6 rounded-lg bg-gray-900/40 border border-yellow-500/10">
        <div className="flex items-center gap-3 mb-4">
          <ThumbsUp className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-unbounded font-semibold text-yellow-400">More Like This</h3>
        </div>
        {similarMovies.length > 0 ? (
          <SimilarMoviesGrid items={similarMovies} />
        ) : (
          <p className="text-gray-500 text-sm italic">Not enough data for recommendations yet</p>
        )}
      </div>

      {/* Technical Specs hidden for now */}

      {/* Streaming Availability */}
      <div className="mt-8 p-6 rounded-lg bg-gray-900/40 border border-yellow-500/10">
        <div className="flex items-center gap-3 mb-4">
          <Play className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-unbounded font-semibold text-yellow-400">Where to Watch</h3>
        </div>
        {watchProviders ? (
          <WatchProviders providersByRegion={watchProviders} preferredRegion="US" />
        ) : (
          <p className="text-gray-500 text-sm italic">No provider data available</p>
        )}
      </div>

      {/* Coming Soon Summary */}
      <div className="mt-8 p-6 rounded-lg bg-gradient-to-r from-yellow-900/20 to-gray-900/40 border border-yellow-500/20">
        <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-4">🚀 Upcoming Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="text-yellow-300 font-semibold mb-2">Data Enrichment (TMDB)</h4>
            <ul className="space-y-1 text-gray-400">
              <li>• Full cast & crew details with photos</li>
              <li>• Photo gallery & movie stills</li>
              <li>• Official trailers & video clips</li>
              <li>• Technical specifications</li>
              <li>• Awards & nominations history</li>
            </ul>
          </div>
          <div>
            <h4 className="text-yellow-300 font-semibold mb-2">Community Features</h4>
            <ul className="space-y-1 text-gray-400">
              <li>• User reviews & comments</li>
              <li>• Community rating statistics</li>
              <li>• Similar movie recommendations (ML)</li>
              <li>• Movie trivia & fun facts</li>
              <li>• Streaming availability (JustWatch)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Database & External IDs (bottom) */}
      <div className="mt-8 p-6 rounded-lg bg-gray-900/40 border border-yellow-500/10">
        <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-4">Database & External IDs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Database ID</div>
            <div className="font-mono text-gray-200">{movie.id}</div>
          </div>
          {movie.tmdb_id && (
            <div>
              <div className="text-sm text-gray-400 mb-1">TMDB ID</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-200">{movie.tmdb_id}</span>
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                  title="Open on TMDB"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
          {movie.imdb_id && (
            <div>
              <div className="text-sm text-gray-400 mb-1">IMDB ID</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-200">{movie.imdb_id}</span>
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                  title="Open on IMDB"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
          {movie.imdb_votes && (
            <div>
              <div className="text-sm text-gray-400 mb-1">IMDB Votes</div>
              <div className="text-gray-200">{movie.imdb_votes.toLocaleString()}</div>
            </div>
          )}
        </div>
        {/* Admin IMDb editor (behind env flag) */}
        {(process.env.NEXT_PUBLIC_ENABLE_IMDB_ADMIN === 'true' || process.env.ENABLE_IMDB_ADMIN === 'true') && (
          <ImdbIdEditor movieId={Number(movie.id)} initialImdbId={movie.imdb_id} />
        )}
      </div>
    </div>
  );
}
