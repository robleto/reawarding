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
  const otherUserId = String(body?.userId || '');

  if (!otherUserId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (otherUserId === user.id) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const { user_low, user_high } = canonicalPair(user.id, otherUserId);

  const { data: friendship, error: fetchError } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_low', user_low)
    .eq('user_high', user_high)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!friendship || friendship.status !== 'accepted') {
    return NextResponse.json({ error: 'Not friends' }, { status: 409 });
  }

  const { data: updated, error } = await supabase
    .from('friendships')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', friendship.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ friendship: updated });
}
