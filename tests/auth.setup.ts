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

  await page.fill('#email', email!);
  await page.fill('#password', password!);
  await page.click('button[type="submit"]');

  await expect
    .poll(async () => page.url(), { timeout: 30_000 })
    .toContain('/');

  await expect(
    page.getByTestId('user-menu-trigger').or(page.locator('[data-testid="home-headline"]')).first()
  ).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: authFile });
});
