import { NextResponse } from 'next/server';
import { isUserAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [errorsResult, feedbackResult] = await Promise.all([
    supabaseAdmin.from('error_logs').select('*').order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('feedback').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  if (errorsResult.error) {
    return NextResponse.json({ error: errorsResult.error.message }, { status: 500 });
  }

  if (feedbackResult.error) {
    return NextResponse.json({ error: feedbackResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    recentErrors: errorsResult.data ?? [],
    recentFeedback: feedbackResult.data ?? [],
  });
}
