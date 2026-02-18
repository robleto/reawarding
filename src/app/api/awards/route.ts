import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

type AwardCategory = 'best-picture' | 'best-animated' | 'best-comedy' | 'best-drama';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const category = (searchParams.get('category') || 'best-picture') as AwardCategory;

    if (!yearParam) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
    }

    const year = Number(yearParam);
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Ignore cookie setting errors in route handlers
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Guests (or missing session cookies) should see a zero-state, not a hard error.
      return NextResponse.json({ nominations: { nominee_ids: [], winner_id: null } });
    }

    const { data: nominations, error } = await supabase
      .from('awards')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('category', category)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116: No rows found
      // 42P01: undefined_table, 42703: undefined_column
      if (error.code === '42P01' || error.code === '42703') {
        const fallback = { nominee_ids: [], winner_id: null };
        return NextResponse.json({ nominations: fallback });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = nominations ? nominations : { nominee_ids: [], winner_id: null };
    return NextResponse.json({ nominations: result });
  } catch (error) {
    console.error('Error fetching nominations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch nominations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Ignore cookie setting errors in route handlers
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch (jsonErr) {
      return NextResponse.json(
        {
          error: 'Invalid JSON body',
          details: jsonErr instanceof Error ? jsonErr.message : jsonErr,
        },
        { status: 400 }
      );
    }

    const { year: yearRaw, nominee_ids, winner_id, category: bodyCategory } = body;

    const category = (bodyCategory || 'best-picture') as AwardCategory;

    const year = Number(yearRaw);
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: 'Invalid request data', details: { year: yearRaw } }, { status: 400 });
    }

    if (!Array.isArray(nominee_ids)) {
      return NextResponse.json(
        { error: 'Invalid request data', details: { year, nominee_ids } },
        { status: 400 }
      );
    }

    if (nominee_ids.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 nominees allowed' }, { status: 400 });
    }

    if (winner_id && !nominee_ids.includes(winner_id)) {
      return NextResponse.json(
        { error: 'Winner must be among nominees', details: { winner_id, nominee_ids } },
        { status: 400 }
      );
    }

    // Ensure a profile row exists for this user (to satisfy foreign key constraint)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Error checking for user profile', details: profileError },
        { status: 500 }
      );
    }

    if (!profile) {
      const fallbackUsername = user.email ? user.email.split('@')[0] : user.id.slice(0, 8);
      const { error: insertProfileError } = await supabase.from('profiles').insert({
        id: user.id,
        username: fallbackUsername,
        full_name: null,
        avatar_url: null,
        bio: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertProfileError) {
        return NextResponse.json(
          { error: 'Failed to create user profile', details: insertProfileError },
          { status: 500 }
        );
      }
    }

    // Only send columns that exist in the awards table.
    // Do not send created_at — let DB default handle inserts.
    const upsertPayload = {
      user_id: user.id,
      year,
      category,
      nominee_ids,
      winner_id: winner_id || null,
    };

    const { data, error } = await supabase
      .from('awards')
      .upsert(upsertPayload, { onConflict: 'user_id,year,category' })
      .select('*')
      .single();

    if (error) {
      // 42P01: undefined_table, 42703: undefined_column
      if (error.code === '42P01' || error.code === '42703') {
        return NextResponse.json(
          {
            error: 'Award nominations feature not yet available. Database table needs to be created.',
            details: error,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving nominations:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to save nominations', details: error }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const category = (searchParams.get('category') || 'best-picture') as AwardCategory;

    if (!yearParam) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
    }

    const year = Number(yearParam);
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Ignore cookie setting errors in route handlers
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('awards')
      .delete()
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('category', category);

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete nominations', details: error },
      { status: 500 }
    );
  }
}
