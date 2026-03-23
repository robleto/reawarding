import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that require a valid session — redirect to home if unauthenticated. */
function isProtectedRoute(pathname: string): boolean {
  return (
    /^\/rankings(\/.*)?$/.test(pathname) ||
    /^\/awards(\/.*)?$/.test(pathname) ||
    /^\/year(\/.*)?$/.test(pathname) ||
    /^\/profile(\/.*)?$/.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  // Build a mutable response so we can write refreshed auth cookies back.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed cookies into both the request (for downstream
          // server components) and the response (for the browser).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: always call getUser() — this refreshes the access token when
  // it has expired so every server component in this request can read a valid
  // session.  Do NOT put any logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Individual film detail pages are public and crawlable: /films/:slug/:id
  if (/^\/films\/[^/]+\/[^/]+$/.test(pathname)) {
    return response;
  }

  // Redirect unauthenticated users away from protected routes.
  if (isProtectedRoute(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes that need session data — skip Next.js internals and
    // static assets to avoid unnecessary overhead.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
