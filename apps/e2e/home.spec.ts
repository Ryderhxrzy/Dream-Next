import { expect, test } from "@playwright/test";

test("loads the public home page", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/AF Home|Home/i);
  await expect(page.locator("body")).toBeVisible();
});
