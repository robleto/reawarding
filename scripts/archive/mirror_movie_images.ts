import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.MEDIA_CACHE_BUCKET || "media-cache";
const LIMIT = Number(process.env.MIRROR_LIMIT || process.argv[2] || 100);
const OFFSET = Number(process.env.MIRROR_OFFSET || process.argv[3] || 0);
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!Number.isFinite(LIMIT) || LIMIT <= 0) {
  console.error("LIMIT must be > 0");
  process.exit(1);
}

type MovieRow = {
  id: string;
  title: string | null;
  release_year: number | null;
  poster_url: string | null;
  thumb_url: string | null;
  cached_poster_url?: string | null;
  cached_thumb_url?: string | null;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPath(kind: "posters" | "thumbs", id: string, title: string | null, year: number | null) {
  const base = slugify(`${title || id}-${year || ""}`);
  return `${kind}/${base || id}.jpg`;
}

async function ensureBucket(supabase: ReturnType<typeof createClient>, bucket: string) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (!data?.some((b) => b.name === bucket)) {
    const { error: createError } = await supabase.storage.createBucket(bucket, { public: true });
    if (createError) throw createError;
  }
}

async function download(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    return new Uint8Array(bytes);
  } catch {
    return null;
  }
}

async function existsInBucket(supabase: ReturnType<typeof createClient>, bucket: string, path: string) {
  const lastSlash = path.lastIndexOf("/");
  const folder = lastSlash > -1 ? path.slice(0, lastSlash) : "";
  const fileName = lastSlash > -1 ? path.slice(lastSlash + 1) : path;
  const { data, error } = await supabase.storage.from(bucket).list(folder || undefined, {
    search: fileName,
    limit: 100,
  });
  if (error) return false;
  return (data || []).some((entry) => entry.name === fileName);
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!);

  await ensureBucket(supabase, BUCKET);

  const { data: movies, error } = await supabase
    .from("movies")
    .select("id,title,release_year,poster_url,thumb_url,cached_poster_url,cached_thumb_url")
    .or("cached_poster_url.is.null,cached_thumb_url.is.null")
    .order("id", { ascending: true })
    .range(OFFSET, OFFSET + LIMIT - 1);

  if (error) {
    console.error("Failed loading movies:", error.message);
    process.exit(1);
  }

  const rows = (movies || []) as MovieRow[];
  console.log(`Loaded ${rows.length} movies (offset=${OFFSET}, limit=${LIMIT}, dryRun=${DRY_RUN})`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const movie of rows) {
    const updates: Partial<MovieRow> = {};

    try {
      if (movie.poster_url && !movie.cached_poster_url) {
        const posterPath = buildPath("posters", movie.id, movie.title, movie.release_year);
        const posterExists = await existsInBucket(supabase, BUCKET, posterPath);
        if (!posterExists && !DRY_RUN) {
          const posterBytes = await download(movie.poster_url);
          if (posterBytes) {
            const { error: uploadError } = await supabase.storage
              .from(BUCKET)
              .upload(posterPath, posterBytes, { contentType: "image/jpeg", upsert: true });
            if (uploadError) {
              console.warn(`Poster upload failed for movie ${movie.id}: ${uploadError.message}`);
            }
          }
        }
        const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(posterPath);
        updates.cached_poster_url = publicData.publicUrl;
      }

      if (movie.thumb_url && !movie.cached_thumb_url) {
        const thumbPath = buildPath("thumbs", movie.id, movie.title, movie.release_year);
        const thumbExists = await existsInBucket(supabase, BUCKET, thumbPath);
        if (!thumbExists && !DRY_RUN) {
          const thumbBytes = await download(movie.thumb_url);
          if (thumbBytes) {
            const { error: uploadError } = await supabase.storage
              .from(BUCKET)
              .upload(thumbPath, thumbBytes, { contentType: "image/jpeg", upsert: true });
            if (uploadError) {
              console.warn(`Thumb upload failed for movie ${movie.id}: ${uploadError.message}`);
            }
          }
        }
        const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath);
        updates.cached_thumb_url = publicData.publicUrl;
      }

      if (Object.keys(updates).length === 0) {
        skipped += 1;
        continue;
      }

      if (!DRY_RUN) {
        const { error: updateError } = await supabase.from("movies").update(updates).eq("id", movie.id);
        if (updateError) {
          failed += 1;
          console.warn(`DB update failed for movie ${movie.id}: ${updateError.message}`);
          continue;
        }
      }

      updated += 1;
      if (updated % 20 === 0) {
        console.log(`Progress: updated=${updated}, skipped=${skipped}, failed=${failed}`);
      }
    } catch (error) {
      failed += 1;
      console.warn(`Failed movie ${movie.id}:`, error);
    }
  }

  console.log(`Done. updated=${updated}, skipped=${skipped}, failed=${failed}`);
}

void main();
