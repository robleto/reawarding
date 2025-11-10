import puppeteer, { type Browser } from 'puppeteer';

export const runtime = 'nodejs'; // Ensure Node.js runtime (not Edge)
export const dynamic = 'force-dynamic';

function badRequest(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const fullPage = searchParams.get('fullPage') === 'true';
  const width = Number(searchParams.get('w') || 1200);
  const height = Number(searchParams.get('h') || 630);

  if (!url) return badRequest('Missing required "url" query parameter');
  try {
    new URL(url);
  } catch {
    return badRequest('Invalid URL');
  }

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
  const buffer = await page.screenshot({ type: 'png', fullPage });
    await page.close();

    const blob = new Blob([buffer as any], { type: 'image/png' });
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Puppeteer screenshot error:', err);
    return badRequest(err?.message || 'Screenshot failed', 500);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
