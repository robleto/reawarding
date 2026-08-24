import { test, expect, type Page } from '@playwright/test';

/**
 * Oscar Night Readiness — signed-in behaviour.
 *
 * The signed-out rendering is easy to eyeball; what needs a real session is the
 * seen-count path. Nominated films are the newest in the catalog, so most of a
 * slate falls outside the 3,000-row window `useMovieDataWithGuest` fetches
 * (`.range(0, 2999)`, no ORDER BY). The readiness page therefore takes display
 * data from its own targeted fetch and keeps a local optimistic overlay,
 * because `updateMovieRanking` persists such a film correctly but can only
 * patch its own `movies` array locally. This spec covers that overlay.
 *
 * It mutates the test user's rankings, so it toggles back and asserts the
 * original count is restored.
 */

const READINESS_URL = '/films/collections/readiness';

/** "Best Picture 3 of 10" -> { seen: 3, total: 10 } */
async function readRow(page: Page, category: string) {
  const row = page.locator('li').filter({ hasText: new RegExp(`${category}\\s+\\d+ of \\d+`) }).first();
  const text = (await row.innerText()).replace(/\s+/g, ' ');
  const m = text.match(/(\d+) of (\d+)/);
  if (!m) throw new Error(`No "X of Y" in row for ${category}: ${text}`);
  return { row, seen: Number(m[1]), total: Number(m[2]) };
}

test.describe('Oscar Night Readiness', () => {
  test('renders the slate with a countdown and per-category counts', async ({ page }) => {
    await page.goto(READINESS_URL);

    await expect(page.getByRole('heading', { name: 'Oscar Night Readiness' })).toBeVisible();

    // Countdown to the next ceremony, whether or not that cycle has nominees.
    await expect(page.getByText(/ceremony in/i)).toBeVisible();
    await expect(page.locator('text=/^\\d+$/').first()).toBeVisible();

    // Every competitive category of the slate, none dropped.
    const rows = page.locator('li').filter({ hasText: /\d+ of \d+/ });
    await expect(rows).toHaveCount(24);

    // Best Picture is the only category with ten nominees — a cheap check that
    // real per-category data is being read rather than a uniform placeholder.
    const bp = await readRow(page, 'Best Picture');
    expect(bp.total).toBe(10);
  });

  test('the short-film categories are trackable, not just listed', async ({ page }) => {
    await page.goto(READINESS_URL);

    // These were 0/5 resolvable before the shorts were imported and would have
    // rendered as "not in catalog" placeholders with nothing to check off.
    for (const category of [
      'Best Documentary Short Film',
      'Best Live Action Short Film',
      'Best Animated Short Film',
    ]) {
      const { row, total } = await readRow(page, category);
      expect(total).toBe(5);
      await row.getByRole('button').first().click();
      await expect(row.getByRole('button', { name: /Mark as (seen|unseen)|Track this film/ })).toHaveCount(5);
      await row.getByRole('button').first().click(); // collapse
    }
  });

  test('marking a nominee seen updates its category count and the total', async ({ page }) => {
    await page.goto(READINESS_URL);

    const category = 'Best Documentary Short Film';
    const before = await readRow(page, category);
    const totalBefore = await page.locator('p').filter({ hasText: /^\d+\/\d+$/ }).first().innerText();

    await before.row.getByRole('button').first().click();

    // Toggle the first nominee that is currently unseen.
    const toggle = before.row
      .getByRole('button', { name: /Track this film|Mark as seen/ })
      .first();
    await toggle.click();

    await expect
      .poll(async () => (await readRow(page, category)).seen, { timeout: 15_000 })
      .toBe(before.seen + 1);

    const afterTotal = await page.locator('p').filter({ hasText: /^\d+\/\d+$/ }).first().innerText();
    expect(afterTotal).not.toBe(totalBefore);

    // Restore — this writes to the shared test user, so leave it as found.
    await before.row.getByRole('button', { name: /Mark as unseen/ }).first().click();
    await expect
      .poll(async () => (await readRow(page, category)).seen, { timeout: 15_000 })
      .toBe(before.seen);
  });

  test('survives a reload — the count came from the database, not just local state', async ({ page }) => {
    await page.goto(READINESS_URL);
    const category = 'Best Picture';
    const before = await readRow(page, category);

    await page.reload();
    const after = await readRow(page, category);
    expect(after.seen).toBe(before.seen);
    expect(after.total).toBe(before.total);
  });
});
