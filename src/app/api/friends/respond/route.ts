import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

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
  const friendshipId = String(body?.friendshipId || '');
  const action = body?.action as 'accept' | 'decline' | undefined;

  if (!friendshipId || (action !== 'accept' && action !== 'decline')) {
    return NextResponse.json({ error: 'friendshipId and valid action are required' }, { status: 400 });
  }

  const { data: friendship, error: fetchError } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!friendship) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (friendship.addressee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (friendship.status !== 'pending') {
    return NextResponse.json({ error: 'Friendship is not pending' }, { status: 409 });
  }

  const nextStatus = action === 'accept' ? 'accepted' : 'declined';

  const { data: updated, error: updateError } = await supabase
    .from('friendships')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ friendship: updated });
}
