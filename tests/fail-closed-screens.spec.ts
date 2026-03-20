import { expect, test } from "@playwright/test";

test.describe("Fail-closed protected screens", () => {
  test("signed-out users see explicit auth-required states", async ({ page }) => {
    await page.goto("/rankings");
    await expect(page).toHaveURL("/rankings");
    await expect(page.getByTestId("screen-state-auth-required")).toContainText("Sign in to view your rankings");

    await page.goto("/awards");
    await expect(page).toHaveURL("/awards");
    await expect(page.getByTestId("screen-state-auth-required")).toContainText("Sign in to view your awards");
  });
});
