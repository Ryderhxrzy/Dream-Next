import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  test("Empty fields - inline validation", async ({ page }) => {
    await page.goto("/login");

    await page.locator("form").getByRole("button", { name: /^Sign in$/i }).click();

    await expect(page.getByText("Username or Email is required.")).toBeVisible();
    await expect(page.getByText("Password is required.")).toBeVisible();
    await expect(page.locator("#login-email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#login-password")).toHaveAttribute("aria-invalid", "true");
  });
});
