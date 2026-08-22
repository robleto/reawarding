import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { stripe } from '@/lib/stripe';

// Deletes everything listed under "What Gets Deleted" in
// src/app/legal/data-deletion/page.tsx. Rows are removed explicitly (rather
// than relying solely on auth.users FK cascades) so this works regardless of
// whether a given table's cascade is actually wired up in this environment.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = user.id;

  // PAY-2 (docs/audits/2026-08-21-launch-readiness-round3.md): cancel any
  // live Stripe subscription BEFORE touching any table. This has to be a
  // hard abort, not just another entry in deleteErrors below — the
  // deleteErrors pattern still deletes every other table even when one
  // fails, and once the `profiles` row (the only stripe_customer_id link)
  // is gone, a retry of this same request can no longer find the
  // subscription to cancel. Fail here and nothing has been deleted yet.
  const { data: profileForStripe, error: profileForStripeError } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profileForStripeError) {
    console.error(
      `[account/delete] Failed to look up stripe_customer_id for user ${userId}: ${profileForStripeError.message}`
    );
    return NextResponse.json(
      { error: 'Account deletion failed: could not verify billing status. No data was deleted. Please retry or contact support.' },
      { status: 500 }
    );
  }

  const stripeCustomerId = profileForStripe?.stripe_customer_id ?? null;
  if (stripeCustomerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
      });
      await Promise.all(
        subscriptions.data
          .filter((sub) => sub.status !== 'canceled')
          .map((sub) => stripe.subscriptions.cancel(sub.id))
      );
    } catch (err) {
      console.error(
        `[account/delete] Failed to cancel Stripe subscription(s) for user ${userId} (customer ${stripeCustomerId}):`,
        err
      );
      return NextResponse.json(
        { error: 'Account deletion failed: could not cancel your subscription. No data was deleted. Please retry or contact support.' },
        { status: 500 }
      );
    }
  }

  const { data: ownedLists } = await supabaseAdmin
    .from('movie_lists')
    .select('id')
    .eq('user_id', userId);
  const ownedListIds = (ownedLists ?? []).map((l) => l.id);

  const deleteErrors: { table: string; message: string }[] = [];

  if (ownedListIds.length > 0) {
    const { error } = await supabaseAdmin
      .from('movie_list_items')
      .delete()
      .in('list_id', ownedListIds);
    if (error) deleteErrors.push({ table: 'movie_list_items', message: error.message });
  }
  {
    const { error } = await supabaseAdmin.from('movie_lists').delete().eq('user_id', userId);
    if (error) deleteErrors.push({ table: 'movie_lists', message: error.message });
  }
  {
    const { error } = await supabaseAdmin.from('movie_reviews').delete().eq('user_id', userId);
    if (error) deleteErrors.push({ table: 'movie_reviews', message: error.message });
  }
  {
    const { error } = await supabaseAdmin.from('rankings').delete().eq('user_id', userId);
    if (error) deleteErrors.push({ table: 'rankings', message: error.message });
  }
  {
    const { error } = await supabaseAdmin.from('expressions').delete().eq('user_id', userId);
    if (error) deleteErrors.push({ table: 'expressions', message: error.message });
  }
  {
    const { error } = await supabaseAdmin
      .from('activity_events')
      .delete()
      .eq('actor_id', userId);
    if (error) deleteErrors.push({ table: 'activity_events', message: error.message });
  }
  {
    const { error } = await supabaseAdmin
      .from('follows')
      .delete()
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`);
    if (error) deleteErrors.push({ table: 'follows', message: error.message });
  }
  {
    const { error } = await supabaseAdmin
      .from('user_follows')
      .delete()
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`);
    if (error) deleteErrors.push({ table: 'user_follows', message: error.message });
  }
  {
    const { error } = await supabaseAdmin
      .from('friendships')
      .delete()
      .or(
        `requester_id.eq.${userId},addressee_id.eq.${userId},user_high.eq.${userId},user_low.eq.${userId}`
      );
    if (error) deleteErrors.push({ table: 'friendships', message: error.message });
  }
  {
    const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (error) deleteErrors.push({ table: 'profiles', message: error.message });
  }

  if (deleteErrors.length > 0) {
    for (const { table, message } of deleteErrors) {
      console.error(
        `[account/delete] Failed to delete rows from "${table}" for user ${userId}: ${message}`
      );
    }
    return NextResponse.json(
      {
        error: 'Account deletion failed: could not remove all user data. No data was deleted from auth. Please retry or contact support.',
        details: deleteErrors,
      },
      { status: 500 }
    );
  }

  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
