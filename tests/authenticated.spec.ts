/**
 * Authenticated end-to-end tests.
 *
 * Split into two logical sections:
 *
 * 1. Login UI  — no storageState, hits the /login page directly.
 *    Skipped when TEST_USER_EMAIL / TEST_USER_PASSWORD are not set.
 *
 * 2. Authenticated features — uses the saved auth state produced by
 *    global-setup.ts so we only log in once per run.
 *    Skipped when TEST_USER_EMAIL is not set (auth file will be empty).
 */
import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const needsCreds = !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD;

// ---------------------------------------------------------------------------
// 1. Login UI tests  (no storageState — plain browser)
// ---------------------------------------------------------------------------

test.describe('Login page UI', () => {
  test('shows error for invalid credentials', async ({ page }) => {
    test.skip(needsCreds, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run login tests');

    await page.goto('/login');

    await page.fill('#email', 'not-a-real-user@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Supabase returns "Invalid login credentials" for bad email/pw.
    await expect(
      page.locator('text=/invalid login credentials/i')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('successful login redirects to home and removes sign-in button', async ({ page }) => {
    test.skip(needsCreds, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run login tests');

    await page.goto('/login');

    await page.fill('#email', process.env.TEST_USER_EMAIL!);
    await page.fill('#password', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');

    // The app does window.location.href = '/' on success.
    await expect(page).toHaveURL('/', { timeout: 20_000 });

    // The "Log In" nav button should be gone — user is now authenticated.
    await expect(page.getByTestId('primary-cta-login')).not.toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// 2. Authenticated feature tests  (storageState is applied via the project
//    in playwright.config.ts — see the "authenticated" project entry)
// ---------------------------------------------------------------------------

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
    // The "Log In" link only renders when the user is NOT authenticated.
    await expect(page.getByTestId('primary-cta-login')).not.toBeAttached();
  });

  test('My Lists page shows the auto-provisioned Watchlist', async ({ page }) => {
    await page.goto('/lists');

    // ensureUserWatchlist creates a list named "Watchlist" on the user's
    // first authenticated request.  Give it a generous timeout so the page
    // can fully hydrate and fetch lists from Supabase.
    await expect(
      page.getByText('Watchlist', { exact: false })
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Rankings page loads without a crash', async ({ page }) => {
    await page.goto('/rankings');

    // The page should either show film cards or the empty state — either way
    // the page itself must finish rendering without an error boundary.
    // We wait for one of two reliable indicators.
    await expect(
      page
        .locator('[data-testid="movie-row-card"]')
        .or(page.locator('text=/no rankings yet/i'))
        .or(page.locator('text=/start ranking/i'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('invalid /lists redirect — unauthenticated page does not appear', async ({ page }) => {
    // Confirm that navigating to /lists while authenticated does NOT redirect
    // to the login page (i.e., the auth session is working end-to-end).
    await page.goto('/lists');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('theme toggle changes dark/light mode', async ({ page }) => {
    // The theme toggle lives inside the authenticated user menu dropdown.
    await page.goto('/');
    await expect(page.getByTestId('home-headline')).toBeVisible({ timeout: 10_000 });

    // Record the initial theme state.
    const htmlEl = page.locator('html');
    const initiallyDark = await htmlEl.evaluate((el) => el.classList.contains('dark'));

    // Open the user menu dropdown to expose the toggle.
    await page.getByTestId('user-menu-trigger').click();
    await expect(page.getByTestId('theme-toggle')).toBeVisible({ timeout: 5_000 });

    // Click the toggle and verify the class flips.
    await page.getByTestId('theme-toggle').click();
    if (initiallyDark) {
      await expect(htmlEl).not.toHaveClass(/dark/);
    } else {
      await expect(htmlEl).toHaveClass(/dark/);
    }

    // Toggle back to restore the original state.
    // The dropdown is still open after the first toggle click — click directly.
    await expect(page.getByTestId('theme-toggle')).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('theme-toggle').click();
    if (initiallyDark) {
      await expect(htmlEl).toHaveClass(/dark/);
    } else {
      await expect(htmlEl).not.toHaveClass(/dark/);
    }
  });
});
