import { NextRequest, NextResponse } from 'next/server';
import { landingDb, sanitizeAttribution, isVariant } from '@/lib/landingDb';

// Funnel events for the landing-page A/B test (docs/validation/landing-page-test.md).
// Fire-and-forget from the browser: a failure here must never block the page or
// the signup form, so every error path still returns 200-with-ok:false.

const ALLOWED_EVENTS = [
  'lp_view',
  'lp_scroll_50',
  'cta_click',
  'email_submitted',
  'step2_upload',
  'step2_declined',
] as const;

type LandingEvent = (typeof ALLOWED_EVENTS)[number];

function isEvent(value: unknown): value is LandingEvent {
  return typeof value === 'string' && (ALLOWED_EVENTS as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { variant, event, sessionId, path, attribution } = body;

  if (!isVariant(variant) || !isEvent(event) || typeof sessionId !== 'string' || !sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { error } = await landingDb.from('landing_events').insert({
    session_id: sessionId.slice(0, 64),
    variant,
    event,
    path: typeof path === 'string' ? path.slice(0, 200) : null,
    ...sanitizeAttribution(attribution),
  });

  if (error) {
    // Losing an analytics row is not worth surfacing to a visitor mid-scroll.
    console.error('[landing/event] insert failed', error.message);
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({ ok: true });
}
