import { expect, test } from "@playwright/test";

test.describe("Login remember me", () => {
  test("saves the last login identifier when checked", async ({ page }) => {
    const rememberedLogin = "remembered-user@example.com";

    await page.goto("/login");
    await page.evaluate(() => window.localStorage.removeItem("afhome_user_login"));

    await page.getByLabel("Username or Email").fill(rememberedLogin);
    await page.getByLabel("Remember me").check();

    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("afhome_user_login")))
      .toBe(rememberedLogin);

    await page.reload();

    await expect(page.getByLabel("Username or Email")).toHaveValue(rememberedLogin);
    await expect(page.getByLabel("Remember me")).toBeChecked();
  });

  test("clears the remembered login when unchecked", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => window.localStorage.setItem("afhome_user_login", "old-user@example.com"));
    await page.reload();

    await page.getByLabel("Remember me").uncheck();

    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("afhome_user_login")))
      .toBeNull();
  });
});
