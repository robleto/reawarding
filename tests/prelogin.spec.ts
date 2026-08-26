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
// tests/authenticated-features.spec.ts where auth state is available.

// docs/design/logged-out-native-home.md — web guest funnel cut from six
// panels to three. PanelHook/PanelTimeline/PanelReassurance are retired from
// the default path (still exist, unwired) and the six-dot scroll-progress
// rail went with them.
test.describe('Web guest funnel — 3 panels', () => {
  test('retired panels are absent from the DOM', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-headline')).toBeVisible();
    await expect(page.locator('#panel-hook')).toHaveCount(0);
    await expect(page.locator('#panel-timeline')).toHaveCount(0);
    await expect(page.locator('#panel-reassurance')).toHaveCount(0);
    await expect(page.locator('.home-progress')).toHaveCount(0);
  });

  test('no pre-account permanence promise', async ({ page }) => {
    // PanelReassurance used to promise "Forever ... Permanent" to a visitor
    // with no account, contradicted three screens later by "These don't
    // auto-save." The honest claim is portability, not permanence.
    await page.goto('/');
    await expect(page.getByTestId('home-headline')).toBeVisible();
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Forever');
    expect(bodyText).not.toContain('Permanent');
    expect(bodyText).not.toContain('Your canon, on record');
  });
});

// docs/design/logged-out-native-home.md — guest tab bar.
//
// Guests get no bottom nav, full stop — reverted 2026-08-24 after briefly
// showing it once a guest had rated something. That broke the year-walk
// (docs/design/first-rating-payoff.md): the fixed bar sits over the bottom
// of the ledger region and hid the "Next: {year}" button the walk depends on
// to advance. Explicit product call: not for a not-logged-in user, at least
// not yet.
//
// Historical note for anyone reading the git log: the tab-bar-for-guests
// idea was originally written up as fixing "two dead tabs" (guest
// Awards/Rankings bouncing to /login). That bug could not actually occur —
// AppShell gated the tab bar on isAuthenticated, so guests had no tabs at
// all. Both the "fix" and the bug it was fixing were never real; this test
// now just guards the original, correct behaviour staying in place.
test.describe('Guest mobile tab bar', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /** Seeded shape mirrors tests/persistence-boundary.spec.ts. */
  const SEED_MOVIE_ID = '00000000-0000-4000-8000-00000000dead';

  test('is absent on first open, before the guest has rated anything', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-headline')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  });

  test('stays absent even after the guest has rated something', async ({ page }) => {
    await page.addInitScript(
      ([key, movieId]) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            state: {
              rankings: {
                [movieId]: { movieId, ranking: 9, seenIt: true, timestamp: 1 },
              },
              awards: {},
              hasInteracted: true,
            },
            version: 0,
          })
        );
      },
      ['reawarding-guest-rankings', SEED_MOVIE_ID] as const
    );

    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  });
});
