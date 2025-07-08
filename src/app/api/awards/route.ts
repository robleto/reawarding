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

    // Get user's rankings for movies released in the specified year
    const { data: rankings, error } = await supabase
      .from('rankings')
      .select('*, movies(release_year)')
      .eq('user_id', user.id)
      .eq('movies.release_year', year);

    if (error) {
      console.error('Database error:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Rankings feature not yet available. Please check back later.' 
        }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // (No logging for successful GET requests to reduce terminal spam)
    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch rankings' 
    }, { status: 500 });
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { year, nominee_ids, winner_id } = await request.json();

    if (!year || !Array.isArray(nominee_ids)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    if (nominee_ids.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 nominees allowed' }, { status: 400 });
    }

    if (winner_id && !nominee_ids.includes(winner_id)) {
      return NextResponse.json({ error: 'Winner must be among nominees' }, { status: 400 });
    }

    console.log('Saving nominations for user:', user.id, 'year:', year, 'nominees:', nominee_ids, 'winner:', winner_id);

    // Upsert the rankings (do not include release_year)
    const { data, error } = await supabase
      .from('rankings')
      .upsert({
        user_id: user.id,
        nominee_ids: nominee_ids,
        winner_id: winner_id || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) {
      console.error('Supabase upsert error:', error);
      
      // Check if it's a table not found error
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Rankings feature not yet available. Database table needs to be created.' 
        }, { status: 503 });
      }
      
      throw error;
    }

    console.log('Saved successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving rankings:', error);
    
    // Return JSON error response instead of letting Next.js handle it
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Failed to save nominations' }, { status: 500 });
  }
}
