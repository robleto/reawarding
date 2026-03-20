import { expect, test } from '@playwright/test';

const needsCreds = !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD;

test.describe('Authenticated features', () => {
  test.beforeEach(async () => {
    test.skip(
      needsCreds,
      'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run authenticated tests'
    );
  });

  test('home page shows no sign-in button when logged in', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-headline')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('primary-cta-login')).not.toBeAttached();
  });

  test('My Lists page shows the auto-provisioned Watchlist', async ({ page }) => {
    await page.goto('/lists');
    await expect(page.getByText('Watchlist', { exact: false })).toBeVisible({ timeout: 15_000 });
  });

  test('Rankings page loads without a crash', async ({ page }) => {
    await page.goto('/rankings');
    await expect(
      page
        .locator('[data-testid="movie-row-card"]')
        .or(page.locator('text=/no rankings yet/i'))
        .or(page.locator('text=/start ranking/i'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('navigating to /lists while authenticated does not redirect to login', async ({ page }) => {
    await page.goto('/lists');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('theme toggle changes dark/light mode', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-headline')).toBeVisible({ timeout: 10_000 });

    const htmlEl = page.locator('html');
    const initiallyDark = await htmlEl.evaluate((el) => el.classList.contains('dark'));

    await page.getByTestId('user-menu-trigger').click();
    await expect(page.getByTestId('theme-toggle')).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('theme-toggle').click();
    if (initiallyDark) {
      await expect(htmlEl).not.toHaveClass(/dark/);
    } else {
      await expect(htmlEl).toHaveClass(/dark/);
    }

    await expect(page.getByTestId('theme-toggle')).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('theme-toggle').click();
    if (initiallyDark) {
      await expect(htmlEl).toHaveClass(/dark/);
    } else {
      await expect(htmlEl).not.toHaveClass(/dark/);
    }
  });
});
