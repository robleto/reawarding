import { expect, test } from "@playwright/test";

test.describe("Fail-closed protected screens", () => {
  test("signed-out users see explicit auth-required states", async ({ page }) => {
    await page.goto("/rankings");
    await expect(page).toHaveURL("/rankings");
    await expect(page.getByTestId("screen-state-auth-required")).toContainText("Sign in to view your rankings");

    // /awards is guest-first (auth gate removed 2026-05-12): signed-out users
    // get the guest empty state with a sign-in CTA, not a closed screen.
    await page.goto("/awards");
    await expect(page).toHaveURL("/awards");
    await expect(page.getByText("No awards yet")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("primary-cta-login")).toBeVisible();
  });
});
