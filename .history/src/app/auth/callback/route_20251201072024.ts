import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/rankings';
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth-code-error?error=${error}&description=${error_description || 'Authentication failed'}`, requestUrl.origin)
    );
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
          } catch (error) {
            // Cookie setting may fail in Server Components
            console.error('Failed to set cookie:', error);
          }
        },
      },
    }
  );

  // Handle token-based verification (magic links, email confirmation, password reset)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (verifyError) {
      console.error('Error verifying token:', verifyError);
      return NextResponse.redirect(
        new URL(`/auth-code-error?error=${verifyError.name}&description=${verifyError.message}`, requestUrl.origin)
      );
    }

    // Successful verification - redirect to intended destination
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  // Handle OAuth code exchange
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL(`/auth-code-error?error=${exchangeError.name}&description=${exchangeError.message}`, requestUrl.origin)
      );
    }

    // Successful authentication - redirect to intended destination
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  // No code, token, or error - redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
