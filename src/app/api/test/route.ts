import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseBrowser';

export async function GET() {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('movies')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, movies_test: data });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
