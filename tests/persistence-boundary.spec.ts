import { expect, test } from '@playwright/test';

const needsCreds = !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD;

test.describe('Guest/auth persistence boundary', () => {
  test('login resets guest-scoped onboarding and clears duplicate guest caches', async ({ page }) => {
    test.skip(needsCreds, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run persistence boundary tests');

    await page.addInitScript(() => {
      if (window.sessionStorage.getItem('__persistence_boundary_seeded__') === 'true') {
        return;
      }
      window.sessionStorage.setItem('__persistence_boundary_seeded__', 'true');

      window.localStorage.setItem(
        'reawarding-guest-rankings',
        JSON.stringify({
          state: {
            rankings: {
              550: { movieId: 550, ranking: 9, seenIt: true, timestamp: Date.now() },
            },
            awards: {
              1999: {
                year: 1999,
                category: 'best-picture',
                winnerId: 550,
                nomineeIds: [550],
                source: 'manual',
                revisionNumber: 1,
                timestamp: Date.now(),
              },
            },
            hasInteracted: true,
          },
          version: 0,
        })
      );

      window.localStorage.setItem(
        'reawarding_guest_data',
        JSON.stringify({
          rankings: [{ movieId: 550, ranking: 9, seenIt: true, timestamp: Date.now() }],
          hasInteracted: true,
          firstInteractionTime: Date.now(),
          totalInteractions: 1,
        })
      );
      window.localStorage.setItem(
        'reawarding_guest_awards',
        JSON.stringify({
          1999: {
            year: 1999,
            winnerId: 550,
            nomineeIds: [550],
            source: 'manual',
            timestamp: Date.now(),
          },
        })
      );
      window.localStorage.setItem(
        'reawarding-onboarding',
        JSON.stringify({
          state: {
            actorKey: 'guest',
            hasSeenIntro: true,
            stage: 'complete',
            firstYearSelected: 1999,
            starterRatingsCount: 3,
            hasSeenPayoff: true,
            hasDismissedOnboarding: true,
            tipsSeen: ['first-rating'],
            sessionCount: 4,
            lastSessionDate: '2026-03-16',
          },
          version: 0,
        })
      );
    });

    await page.goto('/login');
    await page.fill('#email', process.env.TEST_USER_EMAIL!);
    await page.fill('#password', process.env.TEST_USER_PASSWORD!);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 20_000 });
    await expect(page.getByTestId('primary-cta-login')).not.toBeAttached();

    await expect.poll(async () => {
      return await page.evaluate(() => window.localStorage.getItem('reawarding_guest_data'));
    }).toBeNull();

    await expect.poll(async () => {
      return await page.evaluate(() => window.localStorage.getItem('reawarding_guest_awards'));
    }).toBeNull();

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const raw = window.localStorage.getItem('reawarding-onboarding');
        if (!raw) return null;
        return JSON.parse(raw)?.state?.actorKey ?? null;
      });
    }).not.toBe('guest');
  });
});
