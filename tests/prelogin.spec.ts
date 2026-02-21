import { expect, test } from '@playwright/test';

test('home loads and shows headline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home-headline')).toBeVisible();
});

test('primary CTA navigates to login', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('primary-cta-login').click();
  await expect(page).toHaveURL(/\/login$/);
});

// NOTE: The theme-toggle lives inside the authenticated user dropdown and is
// only rendered when a user is logged in. This test has been moved to
// tests/authenticated.spec.ts where auth state is available.
