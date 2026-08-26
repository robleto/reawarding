import { NextRequest, NextResponse } from "next/server";
import { walkEventsDb, isWalkEventName, isWalkSurface } from "@/lib/walkEventsDb";

// Instrumentation for the guest year-walk (docs/design/first-rating-payoff.md,
// Act 2). Fire-and-forget from the browser: a failure here must never block
// the walk, so every error path still returns 200-with-ok:false, same
// contract as /api/landing/event.

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { sessionId, event, year, position, surface } = body;

  if (
    typeof sessionId !== "string" ||
    !sessionId ||
    !isWalkEventName(event) ||
    !isWalkSurface(surface)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { error } = await walkEventsDb.from("walk_events").insert({
    session_id: sessionId.slice(0, 64),
    event,
    // Null for walk_completed, which isn't about any one year.
    year: typeof year === "number" ? Math.trunc(year) : null,
    position: typeof position === "number" ? Math.trunc(position) : null,
    surface,
  });

  if (error) {
    // Losing an analytics row is not worth surfacing to a guest mid-walk.
    console.error("[walk/event] insert failed", error.message);
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({ ok: true });
}
