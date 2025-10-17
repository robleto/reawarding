import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Tables to back up (add here as needed)
const TABLES = [
  "movies",
  "rankings",
  "movie_lists",
  "movie_list_items",
  "awards",
  "profiles",
  "imports"
];

// Page size per fetch
const PAGE_SIZE = 1000;

function isoStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  return `${yyyy}${mm}${dd}`;
}

async function ensureBucket(supabase: ReturnType<typeof createClient>, bucket = "backups") {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === bucket);
  if (!exists) {
    // create private bucket
    await supabase.storage.createBucket(bucket, { public: false });
  }
}

async function fetchAll(supabase: ReturnType<typeof createClient>, table: string) {
  const all: any[] = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(table).select("*", { count: "exact" }).range(from, to);
    if (error) throw new Error(`Fetch error for ${table}: ${error.message}`);
    all.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

Deno.serve(async (req) => {
  try {
    // Auth: require CRON_SECRET for non-local calls
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!supabaseUrl || !serviceKey) {
      return new Response("Missing env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
    }

    const isLocal = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");
    const bearer = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!isLocal) {
      if (!cronSecret || !bearer || bearer !== `Bearer ${cronSecret}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    await ensureBucket(supabase, "backups");
    const datePrefix = isoStamp();

    const results: Record<string, any> = {};

    for (const table of TABLES) {
      const rows = await fetchAll(supabase, table);
      const payload = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const path = `${datePrefix}/${table}.json`;
      const { error: upErr } = await supabase.storage.from("backups").upload(path, payload, {
        contentType: "application/json",
        upsert: true,
      });
      if (upErr) throw new Error(`Upload error for ${table}: ${upErr.message}`);
      results[table] = rows.length;
    }

    return new Response(JSON.stringify({ success: true, datePrefix, counts: results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
