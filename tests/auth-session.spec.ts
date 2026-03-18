import { expect, test } from '@playwright/test';

const needsCreds = !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD;

test.describe('Auth session stability', () => {
  test('sign in, reload, sign out, and stay signed out on home', async ({ page }) => {
    test.skip(needsCreds, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run auth session tests');

    await page.goto('/login');
    await page.fill('#email', process.env.TEST_USER_EMAIL!);
    await page.fill('#password', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.getByTestId('primary-cta-login')).not.toBeAttached();
    await expect(page.getByTestId('user-menu-trigger')).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.getByTestId('primary-cta-login')).not.toBeAttached();
    await expect(page.getByTestId('user-menu-trigger')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('user-menu-trigger').click();
    await page.getByRole('button', { name: 'Sign Out' }).click();

    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.getByTestId('primary-cta-login')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('user-menu-trigger')).not.toBeAttached();

    await page.reload();
    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.getByTestId('primary-cta-login')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('user-menu-trigger')).not.toBeAttached();

    await page.goto('/');
    await expect(page.getByTestId('primary-cta-login')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('user-menu-trigger')).not.toBeAttached();
  });
});
