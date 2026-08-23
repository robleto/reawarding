import { NextRequest, NextResponse } from 'next/server';
import { landingDb, sanitizeAttribution, isVariant } from '@/lib/landingDb';

// Email capture (POST) and the step-2 costly action (PATCH) for the
// landing-page A/B test — see docs/validation/landing-page-test.md.
//
// Unlike the analytics route, failures here ARE surfaced: a visitor who thinks
// they signed up but didn't is both a lost lead and a corrupted data point.

// Intentionally permissive. Rejecting valid-but-unusual addresses costs a real
// conversion; a junk address costs one row.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const { variant, email, attribution, honeypot } = body;

  // Bots fill every field they find. Humans never see this one, so anything in
  // it is automated — accept the request so the bot stops retrying, write
  // nothing, and don't let it near the conversion count.
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return NextResponse.json({ id: null, ok: true });
  }

  if (!isVariant(variant)) {
    return NextResponse.json({ error: 'Unknown variant' }, { status: 400 });
  }

  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalized || normalized.length > 254 || !EMAIL_RE.test(normalized)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }

  // Re-submitting the same address returns the existing row instead of erroring
  // or double-counting. No unique constraint backs this: a race would create a
  // duplicate, which for a coarse conversion test is a rounding error, whereas a
  // constraint violation shown to a visitor is a lost signup.
  const { data: existing } = await landingDb
    .from('landing_signups')
    .select('id')
    .eq('variant', variant)
    .eq('email', normalized)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ id: existing.id, ok: true, duplicate: true });
  }

  const { data, error } = await landingDb
    .from('landing_signups')
    .insert({
      variant,
      email: normalized,
      ...sanitizeAttribution(attribution),
      user_agent: req.headers.get('user-agent')?.slice(0, 400) ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[landing/signup] insert failed', error?.message);
    return NextResponse.json(
      { error: "Something broke on my end. Try again in a moment?" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id, ok: true });
}

/** Step 2: they shared last season's tracker, or told us they never had one. */
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  const { id, trackerLink, declined } = body;

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing signup id' }, { status: 400 });
  }

  const link = typeof trackerLink === 'string' ? trackerLink.trim().slice(0, 2000) : '';

  if (!link && declined !== true) {
    return NextResponse.json({ error: 'Nothing to record' }, { status: 400 });
  }

  const { error } = await landingDb
    .from('landing_signups')
    .update({
      tracker_link: link || null,
      tracker_declined: declined === true,
      tracker_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[landing/signup] tracker update failed', error.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
