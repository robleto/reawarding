import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authDir = path.resolve('playwright/.auth');
const authFile = path.join(authDir, 'user.json');

function writeEmptyAuthState() {
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
}

setup('authenticate test user', async ({ page, baseURL }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  writeEmptyAuthState();

  setup.skip(!email || !password, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to create authenticated storage state.');

  await page.goto(`${baseURL ?? 'http://127.0.0.1:3000'}/login`, {
    waitUntil: 'domcontentloaded',
  });

  // Wait for hydration before touching the form. `domcontentloaded` fires long
  // before React attaches in dev, and `fill()` on a controlled input that isn't
  // hydrated yet sets the DOM value without updating component state — the form
  // then submits empty, Supabase is never called, and the page just sits on
  // /login. That produced a confusing "user-menu-trigger not found" 30s later
  // and looked exactly like bad credentials.
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('#email');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(email!);
  await page.locator('#password').fill(password!);

  // Confirm React actually took the values before submitting, so a hydration
  // race fails here with a clear message instead of downstream.
  await expect(emailInput).toHaveValue(email!);

  await page.click('button[type="submit"]');

  // Must actually LEAVE /login. The previous check was
  // `.poll(() => page.url()).toContain('/')`, which every URL satisfies — so a
  // failed sign-in sailed past it.
  await expect
    .poll(async () => new URL(page.url()).pathname, { timeout: 30_000 })
    .not.toBe('/login');

  // `home-headline` is only a CSS class now, not a test id, so the old
  // `.or(...)` branch could never match. The user menu is the real signal.
  await expect(page.getByTestId('user-menu-trigger')).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: authFile });
});
