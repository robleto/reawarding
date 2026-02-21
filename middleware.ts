import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  return cookies.some((cookie) => {
    const name = cookie.name.toLowerCase();
    return (
      name.startsWith("sb-") &&
      (name.includes("auth-token") ||
        name.includes("access-token") ||
        name.includes("refresh-token"))
    );
  });
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Keep individual film detail pages public and crawlable:
  // /films/:slug/:id
  if (/^\/films\/[^/]+\/[^/]+$/.test(pathname)) {
    return NextResponse.next();
  }

  if (hasSupabaseAuthCookie(request)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/rankings/:path*",
    "/awards/:path*",
    "/year/:path*",
    "/films/:path*",
    "/profile/:path*",
  ],
};
