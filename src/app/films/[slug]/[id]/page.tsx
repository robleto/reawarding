import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { slugifyTitle } from "@/utils/slug";
import Image from "next/image";
import { normalizeImageUrl } from "@/utils/imageUrl";
import Link from "next/link";

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

  // Fetch similar movies using content-based filtering (non-blocking - don't fail if slow)
  let similarMovies = null;
  try {
    const result = await Promise.race([
      supabaseAdmin.rpc('get_similar_movies', {
        target_movie_id: id,
        limit_count: 12
      }),
      new Promise((resolve) => setTimeout(() => resolve({ data: null }), 2000)) // 2s timeout
    ]);
    similarMovies = (result as any)?.data;
  } catch (error) {
    console.error('Similar movies error:', error);
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-[320px,1fr] gap-6">
        <div className="rounded-xl overflow-hidden border border-yellow-500/20 bg-gray-900/60">
          <div className="relative aspect-[2/3]">
            {poster ? (
              <Image src={poster} alt={movie.title} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-800" />
            )}
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-unbounded font-semibold text-yellow-400">{movie.title}</h1>
          <div className="mt-1 text-gray-400">{movie.release_year}</div>
          {movie.overview && (
            <p className="mt-4 text-gray-200 leading-relaxed">{movie.overview}</p>
          )}

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {movie.runtime ? (
              <div className="px-3 py-2 rounded-lg bg-gray-800/60 border border-yellow-500/10">{movie.runtime} min</div>
            ) : null}
            {movie.mpaa_rating ? (
              <div className="px-3 py-2 rounded-lg bg-gray-800/60 border border-yellow-500/10">Rated {movie.mpaa_rating}</div>
            ) : null}
          </div>

          <div className="mt-4 space-y-1 text-sm">
            <div className="text-gray-400">
              <span className="font-mono">DB ID: {movie.id}</span>
            </div>
            {movie.tmdb_id ? (
              <div>
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-300 hover:text-yellow-200"
                  title="Open on TMDB"
                >
                  TMDB: {movie.tmdb_id}
                </a>
              </div>
            ) : null}
          </div>

          {Array.isArray(movie.genres) && movie.genres.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-yellow-400 font-semibold">Genres</div>
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((g: string, i: number) => (
                  <span key={i} className="px-2 py-1 rounded-full text-xs bg-yellow-900/40 text-yellow-300">{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Similar Movies Section */}
      {similarMovies && similarMovies.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-unbounded font-semibold text-yellow-400 mb-6">More Like This</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {similarMovies.map((m: any) => {
              const href = `/films/${slugifyTitle(m.title)}/${m.id}`;
              const thumb = normalizeImageUrl(m.cached_thumb_url || m.thumb_url || m.poster_url);
              return (
                <Link key={m.id} href={href} className="group block">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-yellow-500/20">
                    {thumb ? (
                      <Image 
                        src={thumb} 
                        alt={m.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 25vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        No Image
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="text-xs text-gray-100 line-clamp-2">{m.title}</div>
                      {m.release_year && (
                        <div className="text-[10px] text-gray-400 mt-0.5">{m.release_year}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 text-center">
                    {Math.round((m.similarity_score || 0) * 100)}% match
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
