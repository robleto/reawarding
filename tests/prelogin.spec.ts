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
// Two rules, and the first one is the easy one to regress: the logged-out
// first-open screen is a single activation surface, so a guest who hasn't
// rated anything gets NO bottom nav. It appears only once they've rated
// something, which is the same moment the home screen swaps to its
// returning-guest state.
//
// Historical note for anyone reading the git log: this was originally written
// up as fixing "two dead tabs" (guest Awards/Rankings bouncing to /login).
// That bug could not actually occur — AppShell gated the tab bar on
// isAuthenticated, so guests had no tabs at all. The real behaviour under
// test is guests *gaining* navigation, and only after first open.
test.describe('Guest mobile tab bar', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /** Seeded shape mirrors tests/persistence-boundary.spec.ts. */
  const SEED_MOVIE_ID = '00000000-0000-4000-8000-00000000dead';

  test('is absent on first open, before the guest has rated anything', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-headline')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  });

  test('appears once rated, showing Home/Films/Lists, never bouncing to /login', async ({ page }) => {
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
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).toBeVisible();

    const labels = await nav.locator('a span').allTextContents();
    expect(labels).toEqual(['Home', 'Films', 'Lists']);

    for (const label of ['Films', 'Lists', 'Home']) {
      await nav.getByRole('link', { name: new RegExp(label) }).click();
      await expect(page).not.toHaveURL(/\/login$/);
    }
  });
});
