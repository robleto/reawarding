import { NextRequest, NextResponse } from "next/server";
import { isUserAdmin } from '@/lib/adminAuth';
import { importTmdbMovie } from '@/lib/tmdbImport';

export async function POST(req: NextRequest) {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { tmdbId } = await req.json();
  if (!tmdbId || (typeof tmdbId !== "string" && typeof tmdbId !== "number")) {
    return NextResponse.json({ error: "Missing or invalid TMDB ID" }, { status: 400 });
  }

  try {
    const movie = await importTmdbMovie(Number(tmdbId), "admin-manual");
    return NextResponse.json({ success: true, movie });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
