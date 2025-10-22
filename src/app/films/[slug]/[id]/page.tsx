import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { slugifyTitle } from "@/utils/slug";
import Image from "next/image";
import { normalizeImageUrl } from "@/utils/imageUrl";

export const dynamic = "force-dynamic";

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
    </div>
  );
}
