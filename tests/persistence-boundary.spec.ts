import { expect, test } from '@playwright/test';

const needsCreds = !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD;

test.describe('Guest/auth persistence boundary', () => {
  test('login resets guest-scoped onboarding and clears duplicate guest caches', async ({ page, request }) => {
    test.skip(needsCreds, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run persistence boundary tests');

    // Seed with a real movie id. The live schema uses UUID ids for movies —
    // a hardcoded numeric id fails the rankings upsert during login migration
    // (invalid uuid cast), which fail-closes the guest-cache cleanup this test
    // is asserting.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const moviesRes = await request.get(`${supabaseUrl}/rest/v1/movies?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    const [movie] = (await moviesRes.json()) as Array<{ id: string }>;
    const movieId = movie.id;

    await page.addInitScript((seedMovieId) => {
      if (window.sessionStorage.getItem('__persistence_boundary_seeded__') === 'true') {
        return;
      }
      window.sessionStorage.setItem('__persistence_boundary_seeded__', 'true');

      window.localStorage.setItem(
        'reawarding-guest-rankings',
        JSON.stringify({
          state: {
            rankings: {
              [seedMovieId]: { movieId: seedMovieId, ranking: 9, seenIt: true, timestamp: Date.now() },
            },
            awards: {
              1999: {
                year: 1999,
                category: 'best-picture',
                winnerId: seedMovieId,
                nomineeIds: [seedMovieId],
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
          rankings: [{ movieId: seedMovieId, ranking: 9, seenIt: true, timestamp: Date.now() }],
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
            winnerId: seedMovieId,
            nomineeIds: [seedMovieId],
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
    }, movieId);

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
