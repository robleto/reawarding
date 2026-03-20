import { expect, test } from '@playwright/test';

const needsCreds = !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD;

test.describe('Login page UI', () => {
  test('shows error for invalid credentials', async ({ page }) => {
    test.skip(needsCreds, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run login tests');

    await page.goto('/login');
    await page.fill('#email', 'not-a-real-user@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/invalid login credentials/i')).toBeVisible({ timeout: 10_000 });
  });

  test('successful login redirects to home and removes sign-in button', async ({ page }) => {
    test.skip(needsCreds, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run login tests');

    await page.goto('/login');
    await page.fill('#email', process.env.TEST_USER_EMAIL!);
    await page.fill('#password', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.getByTestId('primary-cta-login')).not.toBeAttached();
  });
});
