import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

type MovieRow = { id: string; title: string | null; release_year: number | null; poster_url: string | null; thumb_url: string | null };

const BUCKET = Deno.env.get("MEDIA_CACHE_BUCKET") || "media-cache";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function ensureBucket(supabase: ReturnType<typeof createClient>, bucket = BUCKET) {
  const { data } = await supabase.storage.listBuckets();
  if (!data?.some((b) => b.name === bucket)) {
    await supabase.storage.createBucket(bucket, { public: true });
  }
}

async function download(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  } catch (_) {
    return null;
  }
}

function buildPath(kind: "posters" | "thumbs", id: string, title: string | null, year: number | null) {
  const base = slugify(`${title || id}-${year || ""}`);
  return `${kind}/${base || id}.jpg`;
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const isLocal = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");

  // Cron/auth guard
  const normalize = (s: string) => (s || "").trim().replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  let cronHeaderRaw =
    req.headers.get("x-cron-token") ||
    req.headers.get("X-CRON-TOKEN") ||
    req.headers.get("x-job-token") ||
    req.headers.get("X-JOB-TOKEN") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("X-CRON-SECRET") ||
    "";
  if (!cronHeaderRaw) {
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const clone = req.clone();
        const body = await clone.json().catch(() => ({}));
        if (body && typeof body.cron_secret === "string") cronHeaderRaw = body.cron_secret;
      }
    } catch {}
  }
  const cronHeader = normalize(cronHeaderRaw);
  const cronEnv = normalize(cronSecret);
  if (!isLocal) {
    const hasSupabaseAuth = !!(req.headers.get("authorization") || req.headers.get("Authorization")) || !!(req.headers.get("apikey") || req.headers.get("x-api-key") || req.headers.get("X-API-KEY"));
    const cronOk = !!cronEnv && !!cronHeader && cronHeader.length === cronEnv.length && cronHeader === cronEnv;
    if (!hasSupabaseAuth || !cronOk) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
  }

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  try {
    const { limit = 500 } = await req.json().catch(() => ({ limit: 500 }));
    await ensureBucket(supabase, BUCKET);

    // Fetch movies with remote URLs; prefer those without cached_* columns yet
    const { data: movies, error } = await supabase
      .from("movies")
      .select("id,title,release_year,poster_url,thumb_url,cached_poster_url,cached_thumb_url")
      .limit(limit);
    if (error) throw error;

    let mirrored = 0;
    for (const m of (movies as any as MovieRow[])) {
      const updates: Record<string, string | null> = {};
      // Poster
      if (m.poster_url) {
        const posterPath = buildPath("posters", m.id, m.title, m.release_year);
        const { data: headPoster } = await supabase.storage.from(BUCKET).list(undefined, { search: posterPath });
        if (!headPoster || headPoster.length === 0) {
          const bytes = await download(m.poster_url);
          if (bytes) {
            await supabase.storage.from(BUCKET).upload(posterPath, bytes, { contentType: "image/jpeg", upsert: true });
          }
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(posterPath);
        updates["cached_poster_url"] = pub.publicUrl;
      }
      // Thumb
      if (m.thumb_url) {
        const thumbPath = buildPath("thumbs", m.id, m.title, m.release_year);
        const { data: headThumb } = await supabase.storage.from(BUCKET).list(undefined, { search: thumbPath });
        if (!headThumb || headThumb.length === 0) {
          const bytes = await download(m.thumb_url);
          if (bytes) {
            await supabase.storage.from(BUCKET).upload(thumbPath, bytes, { contentType: "image/jpeg", upsert: true });
          }
        }
        const { data: pub2 } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath);
        updates["cached_thumb_url"] = pub2.publicUrl;
      }
      if (Object.keys(updates).length > 0) {
        const { error: upErr } = await supabase.from("movies").update(updates).eq("id", m.id);
        if (!upErr) mirrored++;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    return new Response(JSON.stringify({ success: true, mirrored }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
