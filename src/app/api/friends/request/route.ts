import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

function canonicalPair(a: string, b: string) {
  return a < b ? { user_low: a, user_high: b } : { user_low: b, user_high: a };
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const addresseeId = String(body?.addresseeId || '');

  if (!addresseeId) {
    return NextResponse.json({ error: 'addresseeId is required' }, { status: 400 });
  }

  if (addresseeId === user.id) {
    return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 });
  }

  const { user_low, user_high } = canonicalPair(user.id, addresseeId);

  const { data: existing, error: existingError } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_low', user_low)
    .eq('user_high', user_high)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    if (existing.status === 'accepted') {
      return NextResponse.json({ error: 'Already friends' }, { status: 409 });
    }
    if (existing.status === 'blocked') {
      return NextResponse.json({ error: 'Cannot request this user' }, { status: 403 });
    }

    // Re-request or idempotent pending
    const { data: updated, error: updateError } = await supabase
      .from('friendships')
      .update({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ friendship: updated });
  }

  const { data: created, error } = await supabase
    .from('friendships')
    .insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      user_low,
      user_high,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ friendship: created });
}
