import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { isPremiumUser } from "@/lib/premium";

// Persists a smart-list alert (src/hooks/useSmartListAlerts.ts) as a real
// list. Detection/tease stays free (computed client-side from data the user
// already has); this write is the premium action — same "automation" pillar
// as CSV import, gated the same way.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!(await isPremiumUser(supabase, user.id))) {
    return NextResponse.json(
      { error: "Saving Ready-Made lists is a premium feature. Unlock premium to continue." },
      { status: 403 }
    );
  }

  const body = (await req.json()) as { type?: string; label?: string; movieIds?: string[] };
  const { type, label, movieIds } = body;

  if (!type || !label || !Array.isArray(movieIds) || movieIds.length === 0) {
    return NextResponse.json({ error: "Missing type, label, or movieIds" }, { status: 400 });
  }

  const { data: list, error: listError } = await supabase
    .from("movie_lists")
    .insert({
      user_id: user.id,
      name: label,
      description: `Auto-generated from your seen films • ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      is_public: false,
    })
    .select("id")
    .single();

  if (listError || !list) {
    return NextResponse.json({ error: listError?.message ?? "Failed to create list" }, { status: 500 });
  }

  const items = movieIds.map((movie_id, idx) => ({ list_id: list.id, movie_id, ranking: idx + 1 }));
  const { error: itemsError } = await supabase.from("movie_list_items").insert(items);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ listId: list.id });
}
