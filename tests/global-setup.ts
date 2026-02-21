/**
 * Playwright global setup — logs in as the test user once and saves auth state.
 *
 * Requires two environment variables (add to .env.local or your CI secrets):
 *   TEST_USER_EMAIL    — email of a real, confirmed Supabase account
 *   TEST_USER_PASSWORD — that account's password
 *
 * The resulting session file (playwright/.auth/user.json) is gitignored and
 * reused across the entire authenticated test project so we only hit the
 * login page once per run.
 */
import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  // Always ensure the directory + an empty-state file exist so that the
  // authenticated Playwright project can reference storageState without erroring.
  // Tests inside that project skip themselves when creds are absent.
  const authDir = path.resolve('playwright/.auth');
  fs.mkdirSync(authDir, { recursive: true });
  const authFile = path.join(authDir, 'user.json');

  if (!email || !password) {
    console.warn(
      '\n⚠️  TEST_USER_EMAIL / TEST_USER_PASSWORD not set — ' +
        'writing empty auth state; authenticated tests will skip themselves.\n'
    );
    if (!fs.existsSync(authFile)) {
      fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    }
    return;
  }

  const baseURL =
    config.projects.find((p) => p.use.baseURL)?.use.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    'http://127.0.0.1:3000';

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${baseURL}/login`);

    // Fill the email / password form that lives at /login.
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');

    // The page does window.location.href = '/' on success, so wait for that.
    await page.waitForURL(`${baseURL}/`, { timeout: 20_000 });

    // Persist cookies + localStorage so authenticated tests can reuse them.
    await page.context().storageState({ path: authFile });

    console.log('✅  Auth state saved to playwright/.auth/user.json');
  } catch (err) {
    console.error(
      '\n❌  global-setup: login failed. ' +
        'Check TEST_USER_EMAIL / TEST_USER_PASSWORD and that the dev server is running.\n',
      err
    );
    // Don't throw — let the test runner surface the real failures per-test.
  } finally {
    await browser.close();
  }
}

export default globalSetup;
