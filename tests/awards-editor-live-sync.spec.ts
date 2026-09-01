import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * Ballot editor — live sync + persistence-on-close.
 *
 * Regression coverage for two fixes to the "edit ballot" overlay opened from
 * Home (`/`):
 *
 *  1. YearExplorer.tsx read the nominee count badge / sticky mobile strip
 *     from a stale prop-derived list (`displayNominees`, sourced from the
 *     `existingAward` prop) instead of the live list reported by
 *     EditableYearSection via `onWorkshopNomineesChange`. Add/remove inside
 *     the overlay didn't show up immediately in those two spots.
 *  2. page.tsx never called useUserAwards()'s `refetch` when the overlay
 *     closed, so the archive underneath kept showing pre-edit data even
 *     though the save had already succeeded.
 *
 * Both bugs only manifest with a real save round-trip against Supabase, so
 * this drives the actual dev-server UI rather than mocking the save.
 *
 * IMPORTANT — auto-promote self-healing (discovered while writing this test,
 * not a bug): rating any film 7+ auto-nominates it (Watch → Rate → ReAward).
 * If a nominee whose rating is *still* 7+ is removed via the "Remove
 * nominee" button, YearExplorer's own auto-promote effect immediately
 * re-nominates it — UNLESS that exact removal happens within the same
 * component mount as the film's own auto-promotion (tracked by an in-memory
 * ref that resets on every remount, i.e. every time the overlay is closed
 * and reopened, or the page reloads). So a plain "remove" only looks
 * permanent within the live session; across a remount it silently
 * self-heals back in. That's correct, intentional product behavior (the
 * ballot is derived from ratings, not an independent list) — not something
 * either fix under test claims to change. To make the "survives reopen"
 * assertion meaningful rather than fighting that unrelated feature, this
 * test down-rates a nominee below 7 (via its ballot row's own rating badge)
 * BEFORE removing it, the same way a real user would if they'd changed their
 * mind about the film entirely rather than just reordering the shelf.
 */

const needsCreds = !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Reads the nominee count off Home's own (non-workshop) archive card for a
 *  year — the "{n} of 5" thin-ballot dot indicator. Only valid while the
 *  year stays below the 5-nominee "full ballot" layout switch, which this
 *  test deliberately never crosses (net change is at most +1). */
async function archiveNomineeCount(yearDiv: Locator): Promise<number | null> {
  const text = await yearDiv.innerText();
  const m = text.match(/(\d+) of 5/);
  return m ? Number(m[1]) : null;
}

/** Reads the live "{n}/10 nominees" progress line YearExplorer renders next
 *  to the ballot — the exact text fix #1 made accurate in real time. */
function workshopProgress(page: Page): Locator {
  return page.getByText(/^\d+\/10 nominees$/).first();
}

async function workshopCount(page: Page): Promise<number> {
  const text = await workshopProgress(page).innerText();
  const m = text.match(/(\d+)\/10/);
  if (!m) throw new Error(`Could not parse nominee count from "${text}"`);
  return Number(m[1]);
}

/** Titles currently shown in the workshop's nominee list (left column). */
async function readNomineeTitles(page: Page): Promise<string[]> {
  return page.locator('[data-tour-grid="nominees"] p.line-clamp-2').allInnerTexts();
}

/** A candidate card in the workshop's right-hand movie pool, matched by
 *  EXACT title (not Playwright's substring `hasText`, which could match an
 *  unrelated card whose title contains this one as a substring). Returned as
 *  a Locator (a re-resolving "how to find" descriptor), not a static
 *  ElementHandle — the surrounding grid re-renders on almost every action in
 *  this test (add/remove/rating changes reshuffle sort order), and a
 *  snapshotted handle can go stale ("Element is not attached to the DOM")
 *  between being picked and being clicked. */
function candidateCardByTitle(page: Page, title: string): Locator {
  return page
    .locator('.group')
    .filter({ has: page.locator('p.line-clamp-2', { hasText: new RegExp(`^${escapeRegExp(title)}$`) }) })
    .first();
}

/** First "Rate"-labelled candidate in the workshop's right-hand movie pool —
 *  i.e. a film that is NOT currently a nominee (YearExplorer's candidate
 *  grids explicitly filter out anything in the live nominee-id set).
 *  `excludeTitles` is a defense-in-depth belt-and-suspenders check against a
 *  brief render race right after a nominee add/remove, where a stale
 *  "Rate"-button copy of a film can still be reachable for a tick before the
 *  candidate grid re-excludes it — checking against the CURRENT nominee list
 *  (read fresh by the caller) catches that even if DOM position doesn't. */
async function pickUnratedCandidate(
  page: Page,
  excludeTitles: string[] = []
): Promise<{ locator: Locator; title: string }> {
  const buttons = page.getByRole('button', { name: 'Rate', exact: true });
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const inNomineeGrid = await button.evaluate((el) => !!el.closest('[data-tour-grid="nominees"]'));
    if (inNomineeGrid) continue;
    const title = await button.evaluate(
      (el) => el.closest('.group')?.querySelector('p.line-clamp-2')?.textContent?.trim() ?? ''
    );
    if (title && !excludeTitles.includes(title)) {
      return { locator: candidateCardByTitle(page, title).getByRole('button', { name: 'Rate', exact: true }), title };
    }
  }
  throw new Error('No ratable candidate found in the workshop movie pool');
}

async function rateViaDialog(page: Page, control: Locator, title: string, rating: number) {
  await control.click();
  const dialog = page.getByRole('dialog', { name: new RegExp('^Rate ' + escapeRegExp(title)) });
  await expect(dialog).toBeVisible();
  await dialog.locator('button', { hasText: new RegExp(`^${rating}`) }).first().click();
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });
}

/** A nominee row (WorkshopNomineeRow) in the workshop's left-hand ballot
 *  list, matched by exact title. */
function nomineeRowByTitle(page: Page, title: string): Locator {
  return page
    .locator('[data-tour-grid="nominees"] > div')
    .filter({ has: page.locator('p.line-clamp-2', { hasText: new RegExp(`^${escapeRegExp(title)}$`) }) })
    .first();
}

/** Rates a film that is CURRENTLY a nominee (via its WorkshopNomineeRow
 *  rating badge) down below 7 — must be called BEFORE removing it. See file
 *  header on why a removal doesn't stick against a still-7+ rating. */
async function downRateNominee(page: Page, title: string, rating: number) {
  await rateViaDialog(
    page,
    nomineeRowByTitle(page, title).locator('[data-tour-target="rating-badge"]'),
    title,
    rating
  );
}

async function removeNomineeByTitle(page: Page, title: string) {
  await nomineeRowByTitle(page, title).getByRole('button', { name: 'Remove nominee' }).click();
}

/** Finds a year on Home whose archive already shows a saved ballot with at
 *  least one nominee, preferring a low count (1-3) so this test's net +1
 *  change never crosses the thin/full-ballot layout boundary at 5. Falls
 *  back to seeding a 0-nominee year by rating one film 7+. */
async function findYearToEdit(page: Page): Promise<{ year: string; yearDiv: Locator }> {
  const yearDivs = page.locator('[data-year]');
  const total = await yearDivs.count();
  let zeroYear: { year: string; yearDiv: Locator } | null = null;

  for (let i = 0; i < total; i++) {
    const div = yearDivs.nth(i);
    await div.scrollIntoViewIfNeeded();
    const year = await div.getAttribute('data-year');
    if (!year) continue;
    // Years off-screen render as a loading skeleton until an
    // IntersectionObserver flips them to their real content — poll instead
    // of a fixed sleep so a slow-to-mount year isn't misread as "no count".
    let n: number | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const text = await div.innerText().catch(() => '');
      const m = text.match(/(\d+) of 5/);
      if (m) {
        n = Number(m[1]);
        break;
      }
      await page.waitForTimeout(200);
    }
    if (n === null) continue;
    if (n >= 1 && n <= 3) return { year, yearDiv: div };
    if (n === 0 && !zeroYear) zeroYear = { year, yearDiv: div };
  }

  if (!zeroYear) {
    throw new Error('No year on Home exposed a readable nominee count (thin-ballot dot) to seed or reuse.');
  }

  await zeroYear.yearDiv.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await expect(workshopProgress(page)).toBeVisible();
  const seed = await pickUnratedCandidate(page);
  await rateViaDialog(page, seed.locator, seed.title, 8);
  await expect(workshopProgress(page)).toHaveText('1/10 nominees');
  // Settle: confirm the candidate pool has actually re-excluded the film we
  // just nominated before anything downstream treats it as "still pickable".
  await expect.poll(async () => readNomineeTitles(page)).toContain(seed.title);
  await page.getByRole('button', { name: 'Close ballot editor' }).click();
  await expect.poll(() => archiveNomineeCount(zeroYear!.yearDiv)).toBe(1);
  return zeroYear;
}

test.describe('Ballot editor — live sync + persistence on close', () => {
  test.beforeEach(() => {
    test.skip(needsCreds, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run this test');
  });

  test('remove/add reflect immediately, and persist after the overlay closes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});

    const { year, yearDiv } = await findYearToEdit(page);
    const startCount = await archiveNomineeCount(yearDiv);
    expect(startCount).not.toBeNull();
    const n0 = startCount as number;

    await yearDiv.getByRole('button', { name: /^Edit(?: ballot)?$/ }).first().click();
    await expect(workshopProgress(page)).toBeVisible();
    await expect.poll(() => workshopCount(page)).toBe(n0);
    const initialTitles = await readNomineeTitles(page);
    expect(initialTitles.length).toBe(n0);

    // ── add a different candidate — live sync, add path (fix #1) ─────────
    const candidateA = await pickUnratedCandidate(page, initialTitles);
    await rateViaDialog(page, candidateA.locator, candidateA.title, 8);
    await expect(workshopProgress(page)).toHaveText(`${n0 + 1}/10 nominees`);
    await expect(page.locator('[data-tour-grid="nominees"]')).toContainText(candidateA.title);
    // Settle before treating the pool as stable again — see findYearToEdit's
    // matching comment on why this candidate-exclusion race is real.
    await expect.poll(async () => readNomineeTitles(page)).toContain(candidateA.title);

    // Down-rate it first (still a nominee) so the removal below is durable
    // rather than immediately self-healed by auto-promote — see file header.
    await downRateNominee(page, candidateA.title, 4);
    await expect(workshopProgress(page)).toHaveText(`${n0 + 1}/10 nominees`);
    await expect(page.locator('[data-tour-grid="nominees"]')).toContainText(candidateA.title);

    // ── remove that nominee — live sync, remove path (fix #1) ────────────
    await removeNomineeByTitle(page, candidateA.title);
    await expect(workshopProgress(page)).toHaveText(`${n0}/10 nominees`);
    await expect(page.locator('[data-tour-grid="nominees"]')).not.toContainText(candidateA.title);

    // ── add a second, different candidate — the durable addition ─────────
    const candidateB = await pickUnratedCandidate(page, [...initialTitles, candidateA.title]);
    expect(candidateB.title).not.toBe(candidateA.title);
    await rateViaDialog(page, candidateB.locator, candidateB.title, 8);
    await expect(workshopProgress(page)).toHaveText(`${n0 + 1}/10 nominees`);
    await expect(page.locator('[data-tour-grid="nominees"]')).toContainText(candidateB.title);

    // ── close, then check the ARCHIVE reflects it with NO reload (fix #2) ─
    await page.getByRole('button', { name: 'Close ballot editor' }).click();
    await expect.poll(() => archiveNomineeCount(yearDiv), { timeout: 5_000 }).toBe(n0 + 1);

    // ── reload + reopen — confirms it's a real DB save, not local state ──
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const yearDivAfterReload = page.locator(`[data-year="${year}"]`);
    await yearDivAfterReload.scrollIntoViewIfNeeded();
    await expect.poll(() => archiveNomineeCount(yearDivAfterReload)).toBe(n0 + 1);

    await yearDivAfterReload.getByRole('button', { name: /^Edit(?: ballot)?$/ }).first().click();
    await expect(workshopProgress(page)).toHaveText(`${n0 + 1}/10 nominees`);
    const nomineeGridAfterReload = page.locator('[data-tour-grid="nominees"]');
    await expect(nomineeGridAfterReload).toContainText(candidateB.title);
    await expect(nomineeGridAfterReload).not.toContainText(candidateA.title);

    // ── cleanup: leave the shared test account exactly where it started
    //     (same convention as oscar-readiness.spec.ts) ────────────────────
    await downRateNominee(page, candidateB.title, 4);
    await removeNomineeByTitle(page, candidateB.title);
    await expect(workshopProgress(page)).toHaveText(`${n0}/10 nominees`);
    await page.getByRole('button', { name: 'Close ballot editor' }).click();
    await expect.poll(() => archiveNomineeCount(page.locator(`[data-year="${year}"]`))).toBe(n0);
  });
});
