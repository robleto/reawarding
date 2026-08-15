// Reports the build ID of the currently deployed site. A running client
// compares this against the NEXT_PUBLIC_BUILD_ID baked into its own bundle;
// a mismatch means the app is running stale JavaScript and should reload.
// See src/components/providers/NativeUpdateBridge.tsx.
//
// Must never be cached — a cached answer defeats the entire purpose.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return new Response(
    JSON.stringify({ buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? null }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    },
  );
}
