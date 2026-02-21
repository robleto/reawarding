import { expect, test, type Page } from "@playwright/test";

type TestUser = {
  email: string;
  password: string;
  username?: string;
};

const DEFAULT_MOVIE_QUERY = process.env.CORE_LOOP_MOVIE_QUERY || "Inception";

function parseUsersFromEnv(): TestUser[] {
  const json = process.env.TEST_USERS_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as TestUser[];
      const valid = parsed.filter((u) => u?.email && u?.password);
      if (valid.length > 0) return valid;
    } catch {
      // fall through to single-user fallback
    }
  }

  if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
    return [{ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASSWORD }];
  }

  return [];
}

async function login(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/", { timeout: 20_000 });
  await expect(page.getByTestId("primary-cta-login")).not.toBeAttached();
}

async function logout(page: Page) {
  await page.getByTestId("user-menu-trigger").click();
  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page.getByTestId("primary-cta-login")).toBeVisible({ timeout: 10_000 });
}

async function createList(page: Page, listName: string) {
  await page.goto("/lists");
  await page.getByLabel("Create New List").click();
  await page.fill("#listName", listName);
  await page.fill("#listDescription", "E2E confidence loop list");
  await page.getByRole("button", { name: "Create List" }).click();
  await expect(page).toHaveURL(/\/lists\/[^/]+$/, { timeout: 20_000 });
}

async function addFilmToList(page: Page, query: string) {
  await page.getByRole("button", { name: "Add Movies" }).first().click();
  const input = page.getByPlaceholder("Search for movies to add...");
  await input.fill(query);
  const suggestion = page.locator("ul >> li").filter({ hasText: query }).first();
  await expect(suggestion).toBeVisible({ timeout: 15_000 });
  await suggestion.click();
  await page.getByRole("button", { name: "Add to List" }).click();
  await expect(page.locator('[data-testid="movie-row-card"]').first()).toBeVisible({ timeout: 15_000 });
}

async function rankAFilmIfNeeded(page: Page, query: string) {
  await page.goto("/rankings");
  const emptyState = page.getByText("You haven't rated any movies yet.");
  const hasEmptyState = await emptyState.isVisible().catch(() => false);

  if (hasEmptyState) {
    const input = page.getByPlaceholder("Search for a movie");
    await input.fill(query);
    const suggestion = page.locator(".movie-search-picker__menu li").first();
    await expect(suggestion).toBeVisible({ timeout: 15_000 });
    await suggestion.click();
  }

  await expect(
    page
      .locator('[data-testid="movie-row-card"]')
      .or(page.locator("text=/no rankings yet/i"))
      .first()
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("Multi-user core loop confidence", () => {
  const users = parseUsersFromEnv();

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("runs core loop for each configured user", async ({ page }) => {
    test.skip(
      users.length === 0,
      "Set TEST_USERS_JSON or TEST_USER_EMAIL + TEST_USER_PASSWORD to run core-loop tests."
    );

    for (const [index, user] of users.entries()) {
      const listName = `E2E Core Loop ${Date.now()}-${index + 1}`;

      await test.step(`login: ${user.email}`, async () => {
        await login(page, user);
      });

      await test.step("refresh keeps session alive", async () => {
        await page.reload();
        await expect(page.getByTestId("primary-cta-login")).not.toBeAttached();
      });

      await test.step("create list", async () => {
        await createList(page, listName);
      });

      await test.step("add film to list", async () => {
        await addFilmToList(page, DEFAULT_MOVIE_QUERY);
      });

      await test.step("rank film and view top results", async () => {
        await rankAFilmIfNeeded(page, DEFAULT_MOVIE_QUERY);
      });

      await test.step("logout and login again", async () => {
        await logout(page);
        await login(page, user);
      });

      await test.step("list still visible after relogin", async () => {
        await page.goto("/lists");
        await expect(page.getByText(listName)).toBeVisible({ timeout: 15_000 });
      });
    }
  });
});
