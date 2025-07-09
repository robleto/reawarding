import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    if (!year) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's custom Best Picture nominations/winner for the year from awards table
    const { data: nominations, error } = await supabase
      .from('awards')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
      console.error('Database error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Award nominations feature not yet available. Please check back later.' 
        }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return nominations in expected shape for EditableYearSection
    const result = nominations
      ? nominations
      : { nominee_ids: [], winner_id: null };
    console.log('Returning nominations:', result);
    return NextResponse.json({ nominations: result });
  } catch (error) {
    console.error('Error fetching nominations:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch nominations' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    console.log('Cookies:', cookieStore.getAll());
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User:', user, 'AuthError:', authError);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized', details: authError }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonErr) {
      console.error('Failed to parse JSON body:', jsonErr);
      return NextResponse.json({ error: 'Invalid JSON body', details: jsonErr instanceof Error ? jsonErr.message : jsonErr }, { status: 400 });
    }
    const { year, nominee_ids, winner_id } = body;
    console.log('Incoming POST body:', body);

    if (!year || !Array.isArray(nominee_ids)) {
      return NextResponse.json({ error: 'Invalid request data', details: { year, nominee_ids } }, { status: 400 });
    }

    if (nominee_ids.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 nominees allowed' }, { status: 400 });
    }

    if (winner_id && !nominee_ids.includes(winner_id)) {
      return NextResponse.json({ error: 'Winner must be among nominees', details: { winner_id, nominee_ids } }, { status: 400 });
    }

    const upsertPayload = {
      user_id: user.id,
      year: Number(year),
      nominee_ids: nominee_ids,
      winner_id: winner_id || null,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    console.log('Upsert payload:', upsertPayload);

    // Ensure a row exists in public.users for this user (to satisfy foreign key constraint)
    const { data: publicUser, error: publicUserError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();
    if (publicUserError && publicUserError.code !== 'PGRST116') {
      // Only ignore 'not found' error, otherwise fail
      console.error('Error checking for public.users:', publicUserError);
      return NextResponse.json({ error: 'Error checking for user in public.users', details: publicUserError }, { status: 500 });
    }
    if (!publicUser) {
      // Insert a row into public.users for this user
      const insertUserPayload = {
        id: user.id,
        email: user.email || null,
        created_at: new Date().toISOString(),
      };
      console.log('Attempting to insert into public.users:', insertUserPayload);
      const { error: insertPublicUserError } = await supabase
        .from('users')
        .insert(insertUserPayload);
      if (insertPublicUserError) {
        // If duplicate key error, ignore and continue
        if (
          insertPublicUserError.code === '23505' || // Postgres duplicate key
          (insertPublicUserError.message && insertPublicUserError.message.includes('duplicate key'))
        ) {
          console.warn('public.users row already exists for user:', user.id);
        } else {
          console.error('Error creating missing public.users row:', insertPublicUserError, 'Payload:', insertUserPayload);
          return NextResponse.json({ error: 'Failed to create user in public.users', details: insertPublicUserError, payload: insertUserPayload }, { status: 500 });
        }
      } else {
        console.log('Created missing public.users row for user:', user.id);
      }
    }

    // Ensure a profile row exists for this user (to satisfy foreign key constraint)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    if (profileError && profileError.code !== 'PGRST116') {
      // Only ignore 'not found' error, otherwise fail
      console.error('Error checking for profile:', profileError);
      return NextResponse.json({ error: 'Error checking for user profile', details: profileError }, { status: 500 });
    }
    if (!profile) {
      // Create a minimal profile row (username fallback to user email prefix or user.id)
      let fallbackUsername = user.email ? user.email.split('@')[0] : user.id.slice(0, 8);
      const { error: insertProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: fallbackUsername,
          full_name: null,
          avatar_url: null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (insertProfileError) {
        console.error('Error creating missing profile:', insertProfileError);
        return NextResponse.json({ error: 'Failed to create user profile', details: insertProfileError }, { status: 500 });
      }
      console.log('Created missing profile for user:', user.id);
    }

    // Upsert the user's custom nominations/winner for the year into awards table
    const { data, error } = await supabase
      .from('awards')
      .upsert(upsertPayload, { onConflict: 'user_id,year' })
      .select();

    if (error) {
      console.error('Supabase upsert error:', error, 'Payload:', upsertPayload);
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Award nominations feature not yet available. Database table needs to be created.',
          details: error
        }, { status: 503 });
      }
      // Return full error details for debugging
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
    const year = searchParams.get('year');
    if (!year) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Delete the user's custom nominations for the year
    const { error } = await supabase
      .from('awards')
      .delete()
      .eq('user_id', user.id)
      .eq('year', year);
    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete nominations', details: error }, { status: 500 });
  }
}
